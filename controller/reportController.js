const Report = require('../model/Report');
const Appointment = require('../model/Appointment');
const Client = require('../model/Client');
const Trainer = require('../model/Trainer');

const trainerInsertReport = async (req, res) => {
    const {
        clientUid,
        trainerUid,
        appointmentId,
        exercises,
        rpeDailyRating,
        sorenessDailyRating,
        specialConsiderations,
        foodNotes,
        waterNotes,
        sleepNotes,
        subtotalTrainingVolume,
        reportStatus
    } = req.body;

    if (!clientUid || !trainerUid || !appointmentId) {
        console.log('Client ID, Trainer ID and Appointment ID are required');
        return res.status(400).json({ error: 'Client ID, Trainer ID and Appointment ID are required' });
    }

    console.log(req.body);
   
    try{
        const client = await Client.findOne({ client_uid: clientUid });
        const trainer = await Trainer.findOne({ trainer_uid: trainerUid });
        if (!client || !trainer) {
            console.log('Client or Trainer not found');
            return res.status(404).json({ error: 'Client or Trainer not found' });
        }
        const existingAppointment = await Appointment.findOne({
            _id: appointmentId,
            clientId: client._id,
            trainerId: trainer._id
        });

        if (!existingAppointment) {
            console.log('Appointment not found');
            return res.status(404).json({ error: 'Appointment not found' });
        }

        let updatedReport;

        // Check if a draft report already exists
        const existingReport = await Report.findOne({
            appointment: appointmentId,
            reportStatus: 'draft'
        });

        if (existingReport) {
            console.log('Draft report already exists for this appointment');
            
            try {
                updatedReport = await Report.findByIdAndUpdate(
                    existingReport._id,
                    {
                        exercises: exercises || [],
                        rpeDailyRating: rpeDailyRating || 0,
                        sorenessDailyRating: sorenessDailyRating || 0,
                        specialConsiderations,
                        foodNotes,
                        waterNotes,
                        sleepNotes,
                        subtotalTrainingVolume: subtotalTrainingVolume || 0,
                        reportStatus: reportStatus || existingReport.reportStatus 
                    },
                    { new: true }
                );

                console.log(`Draft report updated. New status: ${updatedReport.reportStatus}`);
            } catch (updateError) {
                console.error('Error updating draft report:', updateError.message);
                return res.status(500).json({ error: 'Failed to update draft report' });
            }

        } else {
            const newReport = new Report({
                client: client._id,
                trainer: trainer._id,
                appointment: appointmentId,
                exercises: exercises || [],
                rpeDailyRating: rpeDailyRating || 0,
                sorenessDailyRating: sorenessDailyRating || 0,
                specialConsiderations,
                foodNotes,
                waterNotes,
                sleepNotes,
                subtotalTrainingVolume: subtotalTrainingVolume || 0,
                reportStatus: reportStatus || 'draft'
            });

            try {
                updatedReport = await newReport.save();
                console.log('New report inserted successfully');
            } catch (insertError) {
                console.error('Error inserting new report:', insertError.message);
                return res.status(500).json({ error: 'Failed to insert new report' });
            }
        }

        //only update the appointment status if the report is completed
        if (updatedReport.reportStatus === 'completed') {
            try {
                // Update the appointment status
                const updatedAppointment = await Appointment.findByIdAndUpdate(
                    appointmentId,
                    { status: 'reported' },
                    { new: true }
                );

                if (!updatedAppointment) {
                    console.error('Failed to update appointment: Not found');
                    return res.status(404).json({ error: 'Appointment not found' });
                }

                console.log('Appointment status updated to reported');

                // Emit the event after successful update
                const io = req.app.get('io');
                io.emit('appointment_status_reported', {
                    appointmentId: updatedAppointment._id,
                    status: updatedAppointment.status
                });

                console.log('Appointment status change event emitted');
            } catch (error) {
                console.error('Error updating appointment status:', error.message);
                return res.status(500).json({ error: 'Internal server error' });
            }
        }

        return res.status(200).json({ message: 'Report processed successfully', report: updatedReport });


    }  catch (error) {
    console.error('Error inserting report:', error.message);
    res.status(500).json({ error: 'Internal server error' });
}
}

const trainerGetAllReports = async (req, res) => {
    const { trainerUid } = req.params;

    if (!trainerUid) {
        console.log('Trainer ID is required');
        return res.status(400).json({ error: 'Trainer ID is required' });
    }

    try {
        const trainer = await Trainer.findOne({ trainer_uid: trainerUid });
        if (!trainer) {
            console.log('Trainer not found');
            return res.status(404).json({ error: 'Trainer not found' });
        }

        const reports = await Report.find({ trainer: trainer._id })
            .populate('client')
            .populate('trainer')
            .populate('appointment')
            .populate('exercises');

        const transformedReports = reports.map(report => ({
            _id: report._id,
            clientUid: report.client.client_uid,
            trainerUid: report.trainer.trainer_uid,
            appointment: report.appointment._id, // Keep appointment id for frontend
            exercises: report.exercises,
            rpeDailyRating: report.rpeDailyRating,
            sorenessDailyRating: report.sorenessDailyRating,
            specialConsiderations: report.specialConsiderations,
            foodNotes: report.foodNotes,
            waterNotes: report.waterNotes,
            sleepNotes: report.sleepNotes,
            reportStatus: report.reportStatus,
            subtotalTrainingVolume: report.subtotalTrainingVolume,
        }));

        console.log('Reports fetched successfully', transformedReports);
        return res.status(200).json({ reports: transformedReports });
        
    } catch (error) {
        console.error('Error fetching reports:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const getClientMonthlyTrainingVolume = async (req, res) => {
    try{
        const {clientUid} = req.params;
        if(!clientUid){
            console.log('Client ID is required');
            return res.status(400).json({error: 'Client ID is required'});
        }
        const client = await Client
            .findOne({client_uid: clientUid});
        if(!client){
            console.log('Client not found');
            return res.status(404).json({error: 'Client not found'});
        }
        const monthlyVolume = await Report.aggregate([
            { 
              $match: { 
                client: client._id,
                reportStatus: 'completed'
              } 
            },
            {
              $lookup: {
                from: 'appointments',
                localField: 'appointment',
                foreignField: '_id',
                as: 'appointmentInfo'
              }
            },
            { $unwind: '$appointmentInfo' },
            {
              $group: {
                _id: {
                  year: { $year: '$appointmentInfo.appointmentDate' },
                  month: { $month: '$appointmentInfo.appointmentDate' }
                },
                totalVolume: { $sum: '$subtotalTrainingVolume' },
                sessionCount: { $sum: 1 }
              }
            },
            {
              $project: {
                _id: 0,
                year: '$_id.year',
                month: '$_id.month',
                totalVolume: 1,
                sessionCount: 1
              }
            },
            { $sort: { year: 1, month: 1 } }
          ]);
      
        //   if (monthlyVolume.length === 0) {
        //     return res.status(404).json({ 
        //       message: 'No training data found for this client'
        //     });
        //   }
          

          res.status(200).json(monthlyVolume);
          console.log('Monthly training volume fetched successfully', monthlyVolume);
      
        } catch (error) {
          console.error('Error fetching monthly training volume:', error);
          res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
        }
}

const getAllReportsByClient = async (req, res) => {
    const { clientUid } = req.params;

    if (!clientUid) {
        console.log('Client ID is required');
        return res.status(400).json({ error: 'Client ID is required' });
    }

    try {
        const client = await Client.findOne({ client_uid: clientUid });
        if (!client) {
            console.log('Client not found');
            return res.status(404).json({ error: 'Client not found' });
        }

        const reports = await Report.find({ client: client._id })
            .populate('trainer')
            .populate('client')
            .populate('appointment')
            .populate('exercises');

        const transformedReports = reports.map(report => ({
            _id: report._id,
            trainerUid: report.trainer.trainer_uid,
            clientUid: report.client.client_uid,
            appointment: report.appointment._id, // Keep appointment id for frontend
            exercises: report.exercises,
            rpeDailyRating: report.rpeDailyRating,
            sorenessDailyRating: report.sorenessDailyRating,
            specialConsiderations: report.specialConsiderations,
            foodNotes: report.foodNotes,
            waterNotes: report.waterNotes,
            sleepNotes: report.sleepNotes,
            reportStatus: report.reportStatus,
            subtotalTrainingVolume: report.subtotalTrainingVolume,
            appointmentDate: report.appointment.appointmentDate, // Include appointment date
        }));

        console.log('Reports fetched successfully', transformedReports);
        return res.status(200).json({ reports: transformedReports });
        
    } catch (error) {
        console.error('Error fetching reports:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    trainerInsertReport,
    trainerGetAllReports,
    getClientMonthlyTrainingVolume,
    getAllReportsByClient,
}


