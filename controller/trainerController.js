const Trainer = require('../model/Trainer');
const Appointment = require('../model/Appointment');
const { updateAppointmentStatus } = require('./appmtController');
const Client = require('../model/Client');

//Fetch all trainers
const getAllTrainers = async (req, res) => {
  try {
    const trainers = await Trainer.find();
    res.status(200).json(trainers);
  } catch (error) {
    console.error('Error fetching trainers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTrainer = async (req, res) => {
  const {trainerUid} = req.params;

  if(!trainerUid){
    console.log('Trainer ID is required:', res.params);
    return res.status(400).json({error: 'Trainer ID is required'});
  }

  try{
    const trainer = await Trainer.findOne({trainer_uid: trainerUid});
    if(!trainer){
      console.log('Trainer not found');
      return res.status(404).json({error: 'Trainer not found'});
    }
    console.log('Trainer details fetched successfully');
    res.status(200).json(trainer);
  } catch (error){
    console.error('Error fetching trainer details:', error.message);
    res.status(500).json({error: 'Internal server error'});
}
};

// Fetch available timeslots for a trainer
const getTrainerSchedule = async (req, res) => {
    const { trainerUid } = req.params;
  
    if (!trainerUid) {
      console.log('Trainer ID is required');
      return res.status(400).json({ error: 'Trainer ID is required' });
    }
  
    try {
      const trainer = await Trainer.findOne({ trainer_uid: trainerUid });
      if (!trainer) {
        return res.status(404).json({ error: 'Trainer not found' });
      }
      //const availableTimeslots = trainer.timeslots.filter(timeslot => timeslot.isAvailable);
      res.status(200).json(trainer.schedule);
      console.log('Trainer\'s schedule fetched successfully');
    } catch (error) {
      console.error('Error fetching available timeslots:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Fetch available timeslots for a trainer on a date
  const getAvailableTimeslots = async (req, res) => {
    const { trainerUid, date } = req.body;
    console.log('Trainer ID:', trainerUid);
    console.log('Date:', date);
    
    if(!trainerUid){
        console.log('Trainer ID is required');
        return res.status(400).json({error: 'Trainer ID and date are required'});
    }

    if(!date){
        console.log('Date is required');
        return res.status(400).json({error: 'Date is required'});
    }

    try{

        const selectedDate = new Date(date);
        console.log('Selected date:', selectedDate);
        const dayOfWeek = selectedDate.toLocaleDateString('en-US', {weekday: 'long'}).toLowerCase();
        console.log('Day of week:', dayOfWeek);

        const trainer = await Trainer.findOne({trainer_uid: trainerUid});
        if(!trainer){
            console.log('Trainer not found');
            return res.status(404).json({error: 'Trainer not found'});
        }

        const daySchedule = trainer.schedule.find(schedule => schedule.dayOfWeek === dayOfWeek);
        if (!daySchedule) {
          console.log('Traienr not working on this day');
          return res.status(200).json({ availableTimeSlots: [], message: 'No schedule found for this day.' }); // Trainer not working on this day
      }

      console.log('Day schedule:', daySchedule);

      //const dayTimeslots = daySchedule.timeslots;
      const currentTime = new Date();
        const dayTimeslots = daySchedule.timeslots.filter(timeslot => {
            const timeslotStartTime = new Date(selectedDate);
            const [hours, minutes] = timeslot.startTime.split(':');
            timeslotStartTime.setHours(hours, minutes, 0, 0);
            return timeslotStartTime > currentTime;
        });

        const bookedAppointments = await Appointment.find({
            trainerId: trainer._id,
            appointmentDate: selectedDate,
            status: 'confirmed',
        });
      console.log('Booked appointments:', bookedAppointments);
      
      const availableTimeSlots = [];
        
        for(const timeslot of dayTimeslots){
            timeslotStartTime = timeslot.startTime;
            timeslotEndTime = timeslot.endTime;

          let isBooked = false;
            for(const appointment of bookedAppointments){
              if(appointment.appointmentTime.start === timeslotStartTime && appointment.appointmentTime.end === timeslotEndTime){
                isBooked = true;
                break;
              }
            }
            if(!isBooked && timeslot.isAvailable){
              availableTimeSlots.push({
                timeslot
              }
              );
            }
        }

        res.status(200).json({ availableTimeSlots });
        console.log('Available timeslots of trainer ' + trainer.email + ' fetched successfully on date:', date);

    } catch (error) {
        console.error('Error fetching available timeslots:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  };
  
// Update timeslot availability for a trainer
const updateTimeslotAvailability = async (req, res) => {
    const { trainerUid, scheduleOfDay } = req.body;

    if(!trainerUid){
        console.log('Trainer ID is required');
        return res.status(400).json({error: 'Trainer ID is required'});
    }

  
    if (!scheduleOfDay || !scheduleOfDay.dayOfWeek || !scheduleOfDay.timeslots) {
      console.log('Day of week and timeslots are required');
      return res.status(400).json({ error: 'Day of week and timeslots are required' });
    }

  try {
      const trainer = await Trainer.findOne({ trainer_uid: trainerUid });
      if (!trainer) {
          console.log('Trainer not found');
          return res.status(404).json({ error: 'Trainer not found' });
      }

       // Find the day schedule and update it
       const dayScheduleIndex = trainer.schedule.findIndex(
        schedule => schedule.dayOfWeek === scheduleOfDay.dayOfWeek
    );
    
    if (dayScheduleIndex !== -1) {
        trainer.schedule[dayScheduleIndex].timeslots = scheduleOfDay.timeslots;
    } else {
        console.log('Day schedule not found');
        return res.status(404).json({ error: 'Day schedule not found' });
    }
    
    await trainer.save();
    console.log('Timeslots updated successfully');

      res.status(200).json({ message: 'Timeslots updated successfully', updatedTrainerTimeSlots });
  } catch (error) {
      console.error('Error updating timeslots:', error.message);
      res.status(500).json({ error: 'Error updating timeslots' });
  }
  };

  //get trainer apppointments
  const getTrainerAppointments = async (req, res) => {
    const { trainerUid } = req.params;
  
    if (!trainerUid) {
      console.log('Trainer ID is required');
      return res.status(400).json({ error: 'Trainer ID is required' });
    }
  
    try {
      const trainer = await Trainer.findOne({ trainer_uid: trainerUid });
      if (!trainer) {
        return res.status(404).json({ error: 'Trainer not found' });
      }
  
      const appointments = await Appointment.find({ trainerId: trainer._id })
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
      console.log('Trainer\'s Appointments fetched successfully');
      res.status(200).json(appointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  const trainerUpdateAppointmentStatus = async (req, res) => {
    const { trainerUid, appointmentId, status } = req.body;
  
    if (!trainerUid || !appointmentId || !status) {
      console.log('Trainer ID, Appointment ID and status are required');
      return res.status(400).json({ error: 'Trainer ID, Appointment ID and status are required' });
    }
  
    try {
      const appointment = await Appointment.findOne({
        trainer_uid: trainerUid,
        _id: appointmentId,
      });
      if (!appointment) {
        console.log('Appointment not found');
        return res.status(404).json({ error: 'Appointment not found' });
      }
      appointment.status = status;
      if(appointment.status === 'completed'){
        const trainer = await Trainer.findOne({ trainer_uid: trainerUid });
        trainer.totalClassConducted += 1;
        await trainer.save();
        console.log('Total class conducted updated successfully');

        const client = await Client.findOne({ client_uid: appointment.client_uid });
        client.methods.deductPoints(250);
        await client.save();
        console.log('Client points deducted successfully');
      }
      await appointment.save();

      console.log('Appointment status updated successfully');
      res.status(200).json(appointment);
    } catch (error) {
      console.error('Error updating appointment status:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }


module.exports = { getAllTrainers , getTrainer , getTrainerSchedule , getAvailableTimeslots, updateTimeslotAvailability, getTrainerAppointments};
