const Appointment = require('../model/Appointment');
const QRCode = require('qrcode');
// Create a new appointment
const createAppointment = async (req, res) => {
  const { clientId, trainerId, serviceType, appointmentDate, appointmentTime, status, isConfirmed} = req.body;
  console.log(req.body);
  try {
    console.log('checking for required fields');
    // Validate required fields
    if (!clientId || !trainerId || !serviceType || !appointmentDate || !appointmentTime) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('validating appointment date');
    // Validate date is in the future
    const bookingDate = new Date(appointmentDate);
    if (bookingDate < new Date()) {
      return res.status(400).json({ error: 'Appointment date must be in the future' });
    }

    console.log('checking for existing appointment');
    // Check for existing appointments in the same time slot
    const existingAppointment = await Appointment.findOne({
      trainerId,
      serviceType,
      appointmentDate,
      'appointmentTime.start': appointmentTime.start,
      state: { $nin: ['cancelled'] }
    });

    if (existingAppointment) {
      console.log('Time slot is already booked');
      return res.status(400).json({ error: 'Time slot is already booked' });
    }

    // Create a new appointment
    const newAppointment = new Appointment({
      clientId,
      trainerId,
      appointmentDate,
      appointmentTime,
      serviceType,
      status,
      isConfirmed,
    });

    console.log('saving appointment');
    const savedAppointment = await newAppointment.save();

    res.status(201).json({ message: 'Appointment created successfully', savedAppointment });
    console.log('Appointment created successfully:', savedAppointment);
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

     // Send notification to client (implement your notification logic here)
     // await notifyClient(appointment.clientId, appointment);
     // Generate a unique string for the QR code
    const qrData = `${clientId}-${trainerId}-${appointmentDate}-${appointmentTime.start}`;

    // Generate QR code (can also be a URL or base64)
    const qrCodeString = await QRCode.toDataURL(qrData);

    appointment.isConfirmed = true;
    appointment.qrCode = { code: qrCodeString, isScanned: false };
    await appointment.save();

    res.status(200).json({ message: 'Appointment confirmed successfully', appointment });

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
  const { status, isConfirmed } = req.body;

  try {
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status, isConfirmed },
      { new: true }
    );

    if (!updatedAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

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
  getAllAppointments,
  getAppointmentsByTrainer,
  updateAppointmentStatus,
  validateQRCode,
};
