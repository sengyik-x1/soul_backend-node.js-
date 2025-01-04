const Appointment = require('../model/Appointment');
const QRCode = require('qrcode');
// Create a new appointment
const createAppointment = async (req, res) => {
    const { clientId, trainerId, appointmentDate } = req.body;
  
    try {
      // Generate a unique string for the QR code
      const qrData = `${clientId}-${trainerId}-${Date.now()}`;
  
      // Generate QR code (can also be a URL or base64)
      const qrCodeString = await QRCode.toDataURL(qrData);
  
      // Create a new appointment
      const newAppointment = new Appointment({
        clientId,
        trainerId,
        appointmentDate,
        qrCode: { code: qrCodeString },
      });
  
      const savedAppointment = await newAppointment.save();
  
      res.status(201).json({ message: 'Appointment created successfully', savedAppointment });
    } catch (error) {
      console.error('Error creating appointment:', error.message);
      res.status(500).json({ error: 'Error creating appointment' });
    }
  };

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
