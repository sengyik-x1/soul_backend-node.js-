const Trainer = require('../model/Trainer');
const Appointment = require('../model/Appointment');
const { updateAppointmentStatus } = require('./appmtController');
const Client = require('../model/Client');


//Fetch all trainers
const getAllTrainers = async (req, res) => {
  try {
    const trainers = await Trainer.find();
    console.log('All trainers fetched successfully');
    res.status(200).json(trainers);
  } catch (error) {
    console.error('Error fetching trainers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTrainer = async (req, res) => {
  const { trainerUid } = req.params;

  if (!trainerUid) {
    console.log('Trainer ID is required:', res.params);
    return res.status(400).json({ error: 'Trainer ID is required' });
  }

  try {
    const trainer = await Trainer.findOne({ trainer_uid: trainerUid });
    if (!trainer) {
      console.log('Trainer not found');
      return res.status(404).json({ error: 'Trainer not found' });
    }
    console.log('Trainer details fetched successfully');
    res.status(200).json(trainer);
  } catch (error) {
    console.error('Error fetching trainer details:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

//update trainer profile
const updateTrainerProfile = async (req, res) => {
  const {
    trainer_uid,
    email,
    phoneNumber,
    name,
    position,
    description,
    totalClassConducted,
    schedule
  } = req.body;

  if (!trainer_uid) {
    console.log('Trainer ID is required');
    return res.status(400).json({ error: 'Trainer ID is required' });
  }

  try {
    const trainer = await Trainer.findOne({ trainer_uid });

    if (!trainer) {
      console.log('Trainer not found');
      return res.status(404).json({ error: 'Trainer not found' });
    }

    // Update basic profile information
    trainer.email = email || trainer.email;
    trainer.phoneNumber = phoneNumber || trainer.phoneNumber;
    trainer.name = name || trainer.name;
    trainer.position = position || trainer.position;
    trainer.description = description || trainer.description;

    // Only update totalClassConducted if it's provided and greater than current value
    if (totalClassConducted !== undefined && totalClassConducted >= trainer.totalClassConducted) {
      trainer.totalClassConducted = totalClassConducted;
    }

    // Update schedule if provided
    if (schedule && Array.isArray(schedule)) {
      // Process the schedule array from frontend
      const processedSchedule = schedule.map(day => {
        // Ensure dayOfWeek is in lowercase for consistency
        const dayOfWeek = day.dayOfWeek.toLowerCase();

        // Map timeslots from frontend format to backend format
        const timeslots = day.timeslots.map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: slot.isAvailable
        }));

        return {
          dayOfWeek,
          timeslots
        };
      });

      // Replace schedule with the processed one
      trainer.schedule = processedSchedule;
    }

    await trainer.save();
    console.log('Trainer profile updated successfully');
    res.status(200).json({
      message: 'Trainer profile updated successfully',
      trainer
    });

  } catch (error) {
    console.error('Error updating trainer profile:', error.message);

    // Handle duplicate key errors specifically
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Email already in use by another trainer'
      });
    }

    res.status(500).json({ error: 'Internal server error' });
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
      // Get current time in Malaysia timezone (UTC+8)
      const now = new Date();
      // Get Malaysia hour and minute directly
      const malaysiaHour = (now.getUTCHours() + 8) % 24; // Add 8 hours for Malaysia time
      const malaysiaMinute = now.getUTCMinutes();
      
      console.log('Current Malaysia time:', `${malaysiaHour}:${malaysiaMinute}`);
      
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.toLocaleDateString('en-US', {weekday: 'long'}).toLowerCase();
      console.log('Day of week:', dayOfWeek);

      const trainer = await Trainer.findOne({trainer_uid: trainerUid});
      if(!trainer){
          console.log('Trainer not found');
          return res.status(404).json({error: 'Trainer not found'});
      }

      const daySchedule = trainer.schedule.find(schedule => schedule.dayOfWeek === dayOfWeek);
      if (!daySchedule) {
        console.log('Trainer not working on this day');
        return res.status(200).json({ availableTimeSlots: [], message: 'No schedule found for this day.' });
      }

      console.log('Day schedule:', daySchedule);

      // Check if selected date is today
      const today = new Date();
      const isToday = selectedDate.getUTCDate() === today.getUTCDate() && 
                      selectedDate.getUTCMonth() === today.getUTCMonth() && 
                      selectedDate.getUTCFullYear() === today.getUTCFullYear();
      
      // Filter timeslots based on simple hour/minute comparison, but only if the date is today
      const dayTimeslots = daySchedule.timeslots.filter(timeslot => {
          const [slotHours, slotMinutes] = timeslot.startTime.split(':').map(Number);
          
          // If it's not today, keep all timeslots
          if (!isToday) {
              return true;
          }
          
          // If it's today, only keep future timeslots
          const isFutureTimeslot = (slotHours > malaysiaHour) || 
                                  (slotHours === malaysiaHour && slotMinutes > malaysiaMinute);
          
          console.log(`Comparing timeslot ${timeslot.startTime}:`, 
                    `slot time=${slotHours}:${slotMinutes}`, 
                    `malaysiaTime=${malaysiaHour}:${malaysiaMinute}`,
                    `Is today: ${isToday}`,
                    `Is future timeslot: ${isFutureTimeslot}`);
          
          return isFutureTimeslot;
      });
      
      console.log('Filtered dayTimeslots:', JSON.stringify(dayTimeslots, null, 2));

      const bookedAppointments = await Appointment.find({
          trainerId: trainer._id,
          appointmentDate: selectedDate,
          status: 'confirmed',
      });
      console.log('Booked appointments:', bookedAppointments);
   
      const availableTimeSlots = [];
     
      for(const timeslot of dayTimeslots){
          const timeslotStartTime = timeslot.startTime;
          const timeslotEndTime = timeslot.endTime;

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
            });
          }
      }

      res.status(200).json({ availableTimeSlots });
      console.log('Available timeslots:', availableTimeSlots);
      console.log('Available timeslots of trainer ' + trainer.email + ' fetched successfully on date:', date);

  } catch (error) {
      console.error('Error fetching available timeslots:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
};

// Update timeslot availability for a trainer
const updateTimeslotAvailability = async (req, res) => {
  const { trainerUid, scheduleOfDay } = req.body;

  if (!trainerUid) {
    console.log('Trainer ID is required');
    return res.status(400).json({ error: 'Trainer ID is required' });
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
      schedule => schedule.dayOfWeek === scheduleOfDay.dayOfWeek.toLowerCase()
    );

    if (dayScheduleIndex !== -1) {
      trainer.schedule[dayScheduleIndex].timeslots = scheduleOfDay.timeslots;
    } else {
      console.log('Day schedule not found');
      return res.status(404).json({ error: 'Day schedule not found' });
    }

    await trainer.save();
    console.log('Timeslots updated successfully');

    res.status(200).json({ message: 'Timeslots updated successfully', updatedSchedule: trainer.schedule[dayScheduleIndex] });
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
      // .populate({
      //   path: 'clientId',
      //   populate: {
      //     path: 'membership.purchaseHistory.packageType',
      //     model: 'MembershipPackage'
      //   }
      // })
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
    if (appointment.status === 'completed') {
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


module.exports = { getAllTrainers, getTrainer, updateTrainerProfile, getTrainerSchedule, getAvailableTimeslots, updateTimeslotAvailability, getTrainerAppointments };
