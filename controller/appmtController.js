const Appointment = require('../model/Appointment');
const QRCode = require('qrcode');
const Client = require('../model/Client');
const Trainer = require('../model/Trainer');
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

    // Fetch client and trainer
    const client = await Client.findOne({ client_uid: clientUid });
    const trainer = await Trainer.findOne({ trainer_uid: trainerUid });

    if (!client || !trainer) {
      return res.status(404).json({ error: 'Client or Trainer not found' });
    }

    // Check for overlapping appointments
    const existingAppointment = await Appointment.findOne({
      trainerId: trainer._id,
      serviceType,
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
    res.status(201).json({ message: 'Appointment created successfully', savedAppointment });
  } catch (error) {
    console.error('Error creating appointment:', error.message);
    res.status(500).json({ error: 'Error creating appointment' });
  }
};


const confirmAppointment = async (req, res) => {
  const { appointmentId} = req.params;

  try{
    const appointment = await Appointment.findById(appointmentId);
    if(!appointment){
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
    if(trainerExistingAppointment){
      console.log('Trainer already has a confirmed appointment at this time');
      return res.status(400).json({ error: 'Trainer already has a confirmed appointment at this time' });
    }
    const qrData = `${appointment.clientId.client_uid}-${appointment.trainerId.trainer_uid}-${appointment.appointmentDate}-${appointment.appointmentTime.start}`;

    // Generate QR code (can also be a URL or base64)
    const qrCodeString = await QRCode.toDataURL(qrData);
    appointment.qrCode = { code: qrCodeString, isScanned: false };
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
    res.status(200).json({ message: 'Appointment confirmed successfully', populatedAppointment });
    console.log('Appointment confirmed successfully');

  } catch (error){
    res.status(500).json({ error: 'Error fetching appointment' });
  }
}

const rejectAppointment = async (req, res) => {
  const {appointmentId} = req.params;

  try{

    const appointment = await Appointment.findById(appointmentId);
    if(!appointment){
      return res.status(404).json({ error: 'Appointment not found' });
    }
    appointment.status = 'rejected';
    await appointment.save();
    const eventData = {
      appointmentId: appointment._id // Access appointment's _id from MongoDB document
    };
    const io = req.app.get('io');
    io.emit('appointment_rejected', eventData);
    console.log('Appointment rejected successfully', eventData);
    res.status(200).json({ message: 'Appointment rejected successfully', eventData });
  } catch (error){
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
      { new : true }
    );

    if (!updatedAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    console.log('Appointment status updated successfully', updatedAppointment);
    res.status(200).json({ message: 'Appointment updated successfully', updatedAppointment });
  } catch (error) {
    console.error('Error updating appointment:', error.message);
    res.status(500).json({ error: 'Error updating appointment' });
  }
};

//validateQRcode
const validateQRCode = async (req, res) => {
  const { appointmentId, qrCode } = req.body;

  try {
    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check if the QR code matches
    if (appointment.qrCode.code !== qrCode) {
      return res.status(400).json({ error: 'Invalid QR code' });
    }

    // Update the QR code scan status and appointment state
    appointment.qrCode.isScanned = true;
    appointment.state = 'complete';

    await appointment.save();

    res.status(200).json({ message: 'QR code validated successfully', appointment });
  } catch (error) {
    console.error('Error validating QR code:', error.message);
    res.status(500).json({ error: 'Error validating QR code' });
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
};
