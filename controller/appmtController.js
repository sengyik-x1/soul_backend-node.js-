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

    const actualCurrentTimeUTC = new Date(); 

    const todayDateStringMYT = actualCurrentTimeUTC.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

    const todayStartMYT = new Date(`${todayDateStringMYT}T00:00:00.000+08:00`);
    
    const bookingDateUTC = new Date(appointmentDate); 

    console.log('Today (start of day in MYT, as UTC):', todayStartMYT.toISOString());
    console.log('Booking date (UTC midnight):', bookingDateUTC.toISOString());

    if (bookingDateUTC.getTime() < todayStartMYT.getTime() && bookingDateUTC.toDateString() !== todayStartMYT.toDateString()) {
      console.log('Booking date is in the past:', bookingDateUTC.toISOString());
        return res.status(400).json({ error: 'Appointment date must be today or in the future' });
    }

    const bookingDateMYTString = bookingDateUTC.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

    if (bookingDateMYTString === todayDateStringMYT) {
      const currentInstantMYT = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kuala_Lumpur"}));
      const [startHours, startMinutes] = appointmentTime.start.split(':').map(Number);
      
      const appointmentStartTimeTodayMYT = new Date(currentInstantMYT); // Copy current date
      appointmentStartTimeTodayMYT.setHours(startHours, startMinutes, 0, 0); // Set to booking time on today's date

      if (appointmentStartTimeTodayMYT <= currentInstantMYT) {
        console.log('Appointment start time is not in the future for today\'s bookings:', appointmentStartTimeTodayMYT.toISOString());
        return res.status(400).json({ error: 'Appointment start time must be after the current time for today\'s bookings' });
      }
    }

    // Fetch client and trainer
    const client = await Client.findOne({ client_uid: clientUid });
    const trainer = await Trainer.findOne({ trainer_uid: trainerUid });

    if (!client || !trainer) {
      return res.status(404).json({ error: 'Client or Trainer not found' });
    }

    // Check if the client has an active membership
    if (!client.membership || !client.membership.isActive) {
      return res.status(400).json({ error: 'Client does not have an active membership' });
    }

    const pointsRequiredForThisBooking = 250; // Assuming a fixed cost

    // Fetch all existing future (or today) pending or confirmed appointments for this client
    const existingFutureAppointments = await Appointment.find({
      clientId: client._id,
      status: { $in: ['pending', 'confirmed'] }, 
      appointmentDate: { $gte: todayStartMYT }, // Compare with start of today in MYT
    });

    // Calculate total points that would be committed including the new booking
    const totalPointsCommittedWithNewBooking = (existingFutureAppointments.length * pointsRequiredForThisBooking) + pointsRequiredForThisBooking;

    if (client.membership.points < totalPointsCommittedWithNewBooking) {
      console.log('Insufficient points for booking:', client.membership.points, totalPointsCommittedWithNewBooking);
      return res.status(400).json({
        error: `Insufficient points. You have ${client.membership.points} points. This booking and other existing future bookings require a total of ${totalPointsCommittedWithNewBooking} points.`
      });
    }

    const clientOverlapping = await Appointment.findOne({ // findOne is sufficient if you only need to know if one exists
      clientId: client._id,
      appointmentDate: bookingDateUTC,
      status: { $in: ['pending', 'confirmed'] },
      'appointmentTime.start': appointmentTime.start, 
    });
    if (clientOverlapping) {
      console.log('Client already has an appointment at this specific date and start time:', clientOverlapping);
      return res.status(400).json({ error: 'You already have an appointment at this specific date and start time.' });
    }

    const trainerExistingConfirmedAppointment = await Appointment.findOne({
      trainerId: trainer._id,
      appointmentDate: bookingDateUTC,
      'appointmentTime.start': appointmentTime.start,
      status: 'confirmed',
    });

    if (trainerExistingConfirmedAppointment) {
      return res.status(400).json({ error: 'Trainer already has a confirmed appointment at this specific date and start time.' });
    }

    // Create and save appointment
    const newAppointment = new Appointment({
      clientId: client._id,
      trainerId: trainer._id,
      appointmentDate: bookingDateUTC, 
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
      .populate('trainerId'); 

    const io = req.app.get('io');
    if (io) {
        io.emit('new_appointment', populatedAppointment);
        console.log('New appointment event emitted');
    }

    const trainerUserDoc = await User.findOne({ uid: trainerUid }); 
    if (!trainerUserDoc) {
      console.error('Trainer user document not found for sending notification, trainerUid:', trainerUid);
    } else if (trainerUserDoc.fcmToken) {
      try {
        await notification.sendNewBookingNotificationToTrainer(trainerUserDoc.fcmToken, populatedAppointment, trainerUid);
        console.log('Notification sent to trainer', trainerUserDoc.fcmToken);
      } catch (notificationError) {
        console.error('Failed to send notification to trainer:', notificationError);
      }
    } else {
        console.log('Trainer user document found, but no FCM token available for UID:', trainerUid);
    }
    
    res.status(201).json({ message: 'Appointment created successfully', appointment: populatedAppointment }); // Send populated appointment
  } catch (error) {
    console.error('Error creating appointment:', error.message, error.stack);
    res.status(500).json({ error: 'Server error while creating appointment' });
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
      // .populate({
      //   path: 'clientId',
      //   populate: {
      //     path: 'membership.purchaseHistory.packageType',
      //     model: 'MembershipPackage'
      //   }
      // })
      .populate('trainerId');
    const io = req.app.get('io');
    io.emit('appointment_confirmed', { populatedAppointment });
    const user = await User.findOne({ uid: populatedAppointment.clientId.client_uid });
    if (!user) {
      return res.status(404).json({ error: 'Client not found' });
    }
    notification.sendBookingConfirmationNotificationToClient(user.fcmToken, populatedAppointment, populatedAppointment.clientId.client_uid);
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
    notification.sendBookingRejectedNotificationToClient(user.fcmToken, appointment, client.client_uid);
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
    const client = await Client.findById(appointment.clientId).populate('membership.type');
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
        // .populate({
        //   path: 'clientId',
        //   populate: {
        //     path: 'membership.purchaseHistory.packageType',
        //     model: 'MembershipPackage'
        //   }
        // })
        .populate('trainerId');

      const io = req.app.get('io');
      io.emit('appointment_completed', { completedAppointment });
      io.emit('points_deducted', { client });
      trainer.totalClassConducted += 1;
      await trainer.save();
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
  const { clientUid, appointmentId } = req.body;

  try {
    // Find client
    const client = await Client.findOne({ client_uid: clientUid });
    if (!client) {
      console.log('Client not found');
      return res.status(404).json({ error: 'Client not found' });
    }

    // Find appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      console.log('Appointment not found');
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check if the appointment is confirmed
    if (appointment.status !== 'confirmed') {
      console.log('Appointment is not confirmed or already cancelled/completed');
      return res.status(400).json({ error: 'Only confirmed appointments can be cancelled by this action.' });
    }

    // Get current time in Malaysia timezone (UTC+8)
    const now = new Date();
    const utcTime = now.getTime();
    const malaysiaTime = new Date(utcTime + (8 * 60 * 60 * 1000));
    console.log('Current Malaysia time (raw):', malaysiaTime.toISOString());


    // --- IMPROVED DATE HANDLING ---
    // Get the appointment's date object (assuming appointment.appointmentDate is a Date object or parsable string)
    const appointmentDateObj = new Date(appointment.appointmentDate);

    // Get the local date string (YYYY-MM-DD) for the appointment in Malaysia Time
    const appointmentLocalDateString = appointmentDateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

    // Get the local date string (YYYY-MM-DD) for today in Malaysia Time
    const todayLocalDateString = malaysiaTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

    console.log('Appointment local date (MYT):', appointmentLocalDateString);
    console.log('Today local date (MYT):', todayLocalDateString);

    // Check if appointment is in the past
    if (appointmentLocalDateString < todayLocalDateString) {
      console.log('Cannot cancel appointment on past date');
      return res.status(400).json({ error: 'Cannot cancel appointment on a past date' });
    }
    // Check if appointment is today and within the cancellation window
    else if (appointmentLocalDateString === todayLocalDateString) {
      // Appointment is today. Construct its full start time in MYT.
      // appointment.appointmentTime.start is expected as "HH:mm"
      const [startHours, startMinutes] = appointment.appointmentTime.start.split(':').map(Number);
      console.log('Start hours:', startHours, 'Start minutes:', startMinutes);

      // Construct the full date-time string for the appointment in MYT
      const appointmentFullStartTimeString = `${appointmentLocalDateString}T${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}:00+08:00`;
      console.log('Full appointment start time string (MYT):', appointmentFullStartTimeString);
      const actualAppointmentStartTimeMYT = new Date(appointmentFullStartTimeString);
      console.log('Actual appointment start time (MYT):', actualAppointmentStartTimeMYT.toISOString());

      // Calculate time difference in hours
      // malaysiaTime is the current moment in MYT
      const timeDifferenceMs = actualAppointmentStartTimeMYT.getTime() - now.getTime();
      const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60);

      console.log('Current Malaysia time for comparison:', malaysiaTime.toISOString());
      console.log('Actual Appointment start time (MYT):', actualAppointmentStartTimeMYT.toISOString());
      console.log('Time difference (hours):', timeDifferenceHours);

      // Prevent cancellation if less than 1 hour away or if the time has already passed today
      if (timeDifferenceHours < 1) {
        console.log('Cannot cancel appointment within one hour of start time or if it has passed for today');
        return res.status(400).json({
          error: 'Cannot cancel appointment: it is either less than one hour away or its start time today has passed.',
          currentTime: malaysiaTime.toISOString(),
          appointmentTime: actualAppointmentStartTimeMYT.toISOString(),
          hoursUntilAppointment: timeDifferenceHours // Can be negative
        });
      }
    }
    // If it's a future date (not today, not past), cancellation is allowed (falls through).

    // Update appointment status to cancelled
    appointment.status = 'cancelled';
    const updatedAppointment = await appointment.save();

    // Fetch the updated appointment with populated fields
    const cancelledAppointment = await Appointment.findById(updatedAppointment._id)
      .populate({
        path: 'clientId',
        populate: {
          path: 'membership.type',
          model: 'MembershipPackage'
        }
      })
      .populate('trainerId'); // Assuming 'trainerId' directly populates the Trainer model linked via trainer_uid or _id

    // Emit socket event
    if (req.app.get('io')) { // Check if io is available
      const io = req.app.get('io');
      io.emit('appointment_cancelled', { cancelledAppointment }); // Consider namespacing or room-specific emits
      console.log('Socket event "appointment_cancelled" emitted');
    } else {
      console.log('Socket.io instance not found on req.app');
    }

    console.log('Appointment cancelled successfully in DB');

    // Send notification to trainer
    if (cancelledAppointment.trainerId && cancelledAppointment.trainerId.trainer_uid) {
      const trainerUser = await User.findOne({ uid: cancelledAppointment.trainerId.trainer_uid });
      if (trainerUser && trainerUser.fcmToken) {
        // Assuming 'notification' object and its method are defined elsewhere and imported
        // notification.sendBookingCancellationNotificationToTrainer(trainerUser.fcmToken, cancelledAppointment);
        console.log(`Placeholder: Would send notification to trainer ${trainerUser.uid} with token ${trainerUser.fcmToken}`);
        console.log('Cancelled Appointment Notification intended for trainer');
      } else {
        console.log('Trainer user or FCM token not found for notification.');
      }
    } else {
      console.log('Trainer ID or trainer_uid not available on cancelled appointment for sending notification.');
    }

    res.status(200).json({
      message: 'Appointment cancelled successfully',
      cancelledAppointment
    });

  } catch (error) {
    console.error('Error cancelling appointment:', error.message, error.stack);
    // Check for specific MongoDB errors if necessary, e.g., CastError for invalid ObjectId
    res.status(500).json({ error: 'An unexpected error occurred while cancelling the appointment.' });
  }
};


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
