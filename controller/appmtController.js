const Appointment = require('../model/Appointment');
const Client = require('../model/Client');
const Trainer = require('../model/Trainer');
const ServiceType = require('../model/ServiceType');
const User = require('../model/User');
const notification = require('../services/notification');
// Create a new appointment
const createAppointment = async (req, res) => {
  const { clientUid, trainerUid, serviceType, appointmentDate, appointmentTime } = req.body;

  try {
    // Validate required fields
    if (!clientUid || !trainerUid || !serviceType || !appointmentDate || !appointmentTime?.start || !appointmentTime?.end) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(appointmentDate);
    if (bookingDate < today) {
      return res.status(400).json({ error: 'Appointment date must be in the future' });
    }

    // Check if the appointment time is after the current time if the date is today
    if (bookingDate.getTime() === today.getTime()) {
      const currentTime = new Date();
      const [startHours, startMinutes] = appointmentTime.start.split(':');
      const appointmentStartTime = new Date();
      appointmentStartTime.setHours(startHours, startMinutes, 0, 0);

      if (appointmentStartTime <= currentTime) {
        return res.status(400).json({ error: 'Appointment start time must be after the current time' });
      }
    }

    // Fetch client and trainer
    const client = await Client.findOne({ client_uid: clientUid });
    const trainer = await Trainer.findOne({ trainer_uid: trainerUid });

    if (!client || !trainer) {
      return res.status(404).json({ error: 'Client or Trainer not found' });
    }

    //check if the client has sufficient points
    if (client.membership.points < 250) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    // Check if the client has an active membership
    if (!client.membership || !client.membership.isActive) {
      return res.status(400).json({ error: 'Client does not have an active membership' });
    }

    //check client membership points is sufficient for all the pending appointments in the future including the current appointment
    const pendingAppointments = await Appointment.find({
      clientId: client._id,
      status: 'pending' || 'confirmed',
      appointmentDate: { $gte: today },
    });

    const totalPointsRequired = pendingAppointments.length * 250;
    if (client.membership.points < totalPointsRequired) {
      return res.status(400).json({ error: 'Insufficient points for all pending appointments' });
    }

    // Check for overlapping appointments
    const existingAppointment = await Appointment.findOne({
      trainerId: trainer._id,
      appointmentDate,
      // $or: [
      //   { 'appointmentTime.start': { $lt: appointmentTime.end, $gte: appointmentTime.start } },
      //   { 'appointmentTime.end': { $gt: appointmentTime.start, $lte: appointmentTime.end } },
      // ],
      clientId: client._id,
      'appointmentTime.start': appointmentTime.start,
      'appointmentTime.end': appointmentTime.end,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (existingAppointment) {
      return res.status(400).json({ error: 'The selected time slot is already booked' });
    }

    // Check if the trainer already has a confirmed appointment with any client at this time
    const trainerExistingAppointment = await Appointment.findOne({
      trainerId: trainer._id,
      appointmentDate,
      'appointmentTime.start': appointmentTime.start,
      'appointmentTime.end': appointmentTime.end,
      //isConfirmed: true,
      status: 'confirmed',
    });

    if (trainerExistingAppointment) {
      return res.status(400).json({ error: 'Trainer already has a confirmed appointment at this time' });
    }

    // Create and save appointment
    const newAppointment = new Appointment({
      clientId: client._id,
      trainerId: trainer._id,
      appointmentDate,
      appointmentTime,
      serviceType,
    });

    const savedAppointment = await newAppointment.save();
    const populatedAppointment = await Appointment.findById(savedAppointment._id)
      .populate({
        path: 'clientId',
        populate: {
          path: 'membership.type',
          model: 'MembershipPackage'
        }
      })
      .populate({
        path: 'clientId',
        populate: {
          path: 'membership.purchaseHistory.packageType',
          model: 'MembershipPackage'
        }
      })
      .populate('trainerId');

    const io = req.app.get('io');
    io.emit('new_appointment', populatedAppointment);
    console.log('New appointment event emitted');
    // Send notification to the trainer
    const user = await User.findOne({ uid: trainerUid });
    if (!user) {
      return res.status(404).json({ error: 'Trainer not found' });
    }
    await notification.sendNewBookingNotificationToTrainer(user.fcmToken, populatedAppointment);
    console.log('Notification sent to trainer');
    res.status(201).json({ message: 'Appointment created successfully', savedAppointment });
  } catch (error) {
    console.error('Error creating appointment:', error.message);
    res.status(500).json({ error: 'Error creating appointment' });
  }
};



const confirmAppointment = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    //check trainer availability
    const trainerExistingAppointment = await Appointment.findOne({
      trainerId: appointment.trainerId,
      appointmentDate: appointment.appointmentDate,
      'appointmentTime.start': appointment.appointmentTime.start,
      'appointmentTime.end': appointment.appointmentTime.end,
      status: 'confirmed',
    });
    if (trainerExistingAppointment) {
      console.log('Trainer already has a confirmed appointment at this time');
      return res.status(400).json({ error: 'Trainer already has a confirmed appointment at this time' });
    }
    //const qrData = `${appointment.clientId.client_uid}-${appointment.trainerId.trainer_uid}-${appointment.appointmentDate}-${appointment.appointmentTime.start}`;

    // Generate QR code (can also be a URL or base64)
    // const qrCodeString = await QRCode.toDataURL(qrData);
    // appointment.qrCode = { code: qrCodeString, isScanned: false };
    appointment.status = 'confirmed';
    const updatedAppointment = await appointment.save();
    const populatedAppointment = await Appointment.findById(updatedAppointment._id)
      .populate({
        path: 'clientId',
        populate: {
          path: 'membership.type',
          model: 'MembershipPackage'
        }
      })
      .populate({
        path: 'clientId',
        populate: {
          path: 'membership.purchaseHistory.packageType',
          model: 'MembershipPackage'
        }
      })
      .populate('trainerId');
    const io = req.app.get('io');
    io.emit('appointment_confirmed', { populatedAppointment });
    const user = await User.findOne({ uid: populatedAppointment.clientId.client_uid });
    if (!user) {
      return res.status(404).json({ error: 'Client not found' });
    }
    notification.sendBookingConfirmationNotificationToClient(user.fcmToken, populatedAppointment);
    console.log('Appointment Confirmed Notification sent to client');
    res.status(200).json({ message: 'Appointment confirmed successfully', populatedAppointment });
    console.log('Appointment confirmed successfully');

  } catch (error) {
    res.status(500).json({ error: 'Error fetching appointment' });
  }
}

const rejectAppointment = async (req, res) => {
  const { appointmentId } = req.params;

  try {

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    appointment.status = 'rejected';
    await appointment.save();
    const eventData = {
      appointmentId: appointment._id // Access appointment's _id from MongoDB document
    };
    const io = req.app.get('io');
    io.emit('appointment_rejected', eventData);
    console.log('Appointment rejected successfully');
    const client = await Client.findById(appointment.clientId);
    if (!client) {
      console.log('(reject-appt) Client not found');
      return res.status(404).json({ error: 'Client not found' });
    }
    const user = await User.findOne({ uid: client.client_uid });
    if (!user) {
      console.log('(reject-appt) User not found');
      return res.status(404).json({ error: 'Client not found' });
    }
    notification.sendBookingRejectedNotificationToClient(user.fcmToken, appointment);
    console.log('Appointment Rejected Notification sent to client');
    res.status(200).json({ message: 'Appointment rejected successfully', eventData });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching appointment' });
  }
}

// Get all appointments
const getAllAppointments = async (req, res) => {

  try {
    const appointments = await Appointment.find({});
    res.status(200).json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error.message);
    res.status(500).json({ error: 'Error fetching appointments' });
  }
};

// Get appointments by trainer
const getAppointmentsByTrainer = async (req, res) => {
  const { trainerId } = req.params;

  try {
    const appointments = await Appointment.find({ trainerId });
    res.status(200).json(appointments);
  } catch (error) {
    console.error('Error fetching trainer appointments:', error.message);
    res.status(500).json({ error: 'Error fetching trainer appointments' });
  }
};

// Update appointment status
const updateAppointmentStatus = async (req, res) => {
  const { appointmentId } = req.params;
  const { status } = req.body;

  try {
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true }
    );

    if (!updatedAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    console.log('Appointment status updated successfully');
    res.status(200).json({ message: 'Appointment updated successfully', updatedAppointment });
  } catch (error) {
    console.error('Error updating appointment:', error.message);
    res.status(500).json({ error: 'Error updating appointment' });
  }
};

//validateQRcode
const validateQRCode = async (req, res) => {
  const { trainerId, appointmentId, } = req.body;

  try {
    // Find the appointment and populate client and service type
    const appointment = await Appointment.findById(appointmentId)
      .populate('clientId');

    // Check if appointment exists
    if (!appointment) {
      console.log('Appointment not found');
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    const trainer = await Trainer.findOne({ trainer_uid: trainerId });
    if (!trainer) {
      console.log('Trainer not found');
      return res.status(404).json({
        success: false,
        error: 'Trainer not found'
      });
    }

    // Verify the trainer is the assigned trainer
    if (appointment.trainerId.toString() !== trainer._id.toString()) {
      console.log('You are not authorized to validate this appointment');
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to validate this appointment'
      });
    }

    // Check if appointment is already completed
    if (appointment.status === 'complete') {
      console.log('This appointment has already been completed');
      return res.status(400).json({
        success: false,
        error: 'This appointment has already been completed'
      });
    }

    // Validate the appointment date (only valid on the day of appointment)
    const appointmentDate = new Date(appointment.appointmentDate);
    const today = new Date();

    // Reset time parts to compare just the dates
    appointmentDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (appointmentDate.getTime() !== today.getTime()) {
      console.log('QR code is only valid on the day of the appointment');
      return res.status(400).json({
        success: false,
        error: 'QR code is only valid on the day of the appointment'
      });
    }

    // Check if appointment status is confirmed
    if (appointment.status !== 'confirmed') {
      console.log('Cannot complete an appointment with status:', appointment.status);
      return res.status(400).json({
        success: false,
        error: `Cannot complete an appointment with status: ${appointment.status}`
      });
    }

    // Get the service type to determine points to deduct
    const serviceType = await ServiceType.findOne({ name: appointment.serviceType });

    if (!serviceType) {
      return res.status(404).json({
        success: false,
        error: 'Service type not found'
      });
    }

    const pointsToDeduct = 250;

    // Get the client
    const client = await Client.findById(appointment.clientId).populate('membership.type')
      .populate('membership.purchaseHistory.packageType');
    if (!client) {
      console.log('(appmt-controller) Client not found');
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    // Check if client has an active membership
    if (!client.membership || !client.membership.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Client does not have an active membership'
      });
    }

    // Check if client has enough points
    if (client.membership.points < pointsToDeduct) {
      return res.status(400).json({
        success: false,
        error: 'Client does not have enough points for this service'
      });
    }

    try {
      // Deduct points from client's membership
      client.deductPoints(pointsToDeduct);

      // Save the client with updated points
      await client.save();

      // Update the appointment status to complete
      appointment.status = 'complete';
      const updatedAppointment = await appointment.save();
      const completedAppointment = await Appointment.findById(updatedAppointment._id)
        .populate({
          path: 'clientId',
          populate: {
            path: 'membership.type',
            model: 'MembershipPackage'
          }
        })
        .populate({
          path: 'clientId',
          populate: {
            path: 'membership.purchaseHistory.packageType',
            model: 'MembershipPackage'
          }
        })
        .populate('trainerId');

      const io = req.app.get('io');
      io.emit('appointment_completed', { completedAppointment });
      io.emit('points_deducted', { client });
      // Return success response
      res.status(200).json({
      });
      console.log('Appointment completed successfully and points deducted');
    } catch (error) {
      console.error('Error deducting points:', error.message);
      return res.status(400).json({
        success: false,
        error: `Error deducting points: ${error.message}`
      });

    }

  } catch (error) {
    console.error('Error validating QR code:', error.message);
    res.status(500).json({
      success: false,
      error: 'Server error while validating QR code'
    });
  }
};

//cancel appointment by client
const cancelAppointment = async (req, res) => {
  const {clientUid, appointmentId} = req.body;

  try{
    const client = await Client.findOne({client_uid: clientUid});
    if(!client){
      console.log('Client not found');
      return res.status(404).json({error: 'Client not found'});
    }

    const appointment = await Appointment.findById(appointmentId);
    if(!appointment){
      console.log('Appointment not found');
      return res.status(404).json({error: 'Appointment not found'});
    }

    //check if the appointment is confirmed
    if(appointment.status !== 'confirmed'){
      console.log('Appointment is not confirmed');
      return res.status(400).json({error: 'Appointment is not confirmed'});
    }

    //check if the appointment date is in the future and not today at least one hour before the appointment's start time
    const today = new Date();
    today.setHours(0,0,0,0);
    const appointmentDate = new Date(appointment.appointmentDate);
    appointmentDate.setHours(0,0,0,0);
    if(appointmentDate.getTime() < today.getTime()){
      console.log('Cannot cancel appointment on past date');
      return res.status(400).json({error: 'Cannot cancel appointment on past date'});
    }
    else if(appointmentDate.getTime() === today.getTime()){
      const currentTime = new Date();
      const [startHours, startMinutues] = appointment.appointmentTime.start.split(':');
      const appointmentStartTime = new Date();
      appointmentStartTime.setHours(startHours, startMinutues, 0, 0);
      const timeDifference = (appointmentStartTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
      if(timeDifference < 1){
        console.log('Cannot cancel appointment within one hour of start time');
        return res.status(400).json({error: 'Cannot cancel appointment within one hour of start time'});
      }
    }
    

    //update appointment status to cancelled
    appointment.status = 'cancelled';
    const updatedAppointment = await appointment.save();
    const cancelledAppointment = await Appointment.findById(updatedAppointment._id)
    .populate({
      path: 'clientId',
      populate: {
        path: 'membership.type',
        model: 'MembershipPackage'
      }
    })
    .populate({
      path: 'clientId',
      populate: {
        path: 'membership.purchaseHistory.packageType',
        model: 'MembershipPackage'
      }
    })
    .populate('trainerId');

    const io = req.app.get('io');
    io.emit('appointment_cancelled', {cancelledAppointment});
    console.log('Appointment cancelled successfully');
    const user = await User.findOne({uid: cancelledAppointment.trainerId.trainer_uid});
    if(!user){
      console.log('Client not found');
      return res.status(404).json({error: 'Client not found'});
    }
    notification.sendBookingCancellationNotificationToTrainer(user.fcmToken, cancelledAppointment);
    console.log('Cancelled Appointment Notification sent to trainer');
    res.status(200).json({message: 'Appointment cancelled successfully', cancelledAppointment});

  }catch(error){
    console.error('Error cancelling appointment:', error.message);
    res.status(500).json({error: 'Error cancelling appointment'});
  }

}


module.exports = {
  createAppointment,
  confirmAppointment,
  rejectAppointment,
  getAllAppointments,
  getAppointmentsByTrainer,
  updateAppointmentStatus,
  validateQRCode,
  cancelAppointment
};
