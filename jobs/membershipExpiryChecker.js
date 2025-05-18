const cron = require('node-cron');
const Client = require('../model/Client'); // Adjust path as necessary

// Schedule a task to run every day at midnight (00:00)
// You can adjust the cron expression as needed.
// For example, '0 1 * * *' would run at 1 AM every day.
// '*/5 * * * *' would run every 5 minutes (for testing)
const scheduleMembershipCheck = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('Running scheduled job: Checking for expired client memberships - ', new Date().toLocaleString("en-US", {timeZone: "Asia/Kuala_Lumpur"}));
        
        try {
            const now = new Date();
            const expiredMemberships = await Client.find({
                'membership.isActive': true,
                'membership.endDate': { $lt: now } 
            });

            if (expiredMemberships.length > 0) {
                console.log(`Found ${expiredMemberships.length} expired membership(s) to update.`);
                for (const client of expiredMemberships) {
                    client.membership.isActive = false;
                    client.membership.points = 0;
                    await client.save();
                    console.log(`Membership for client ${client.client_uid} (ID: ${client._id}) has been marked as inactive.`);
                }
                console.log('Finished updating expired memberships.');
            } else {
                console.log('No expired memberships found to update.');
            }
        } catch (error) {
            console.error('Error during scheduled membership check:', error.message, error.stack);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kuala_Lumpur" // Important: Run the job according to your server's/business's timezone
    });

    console.log('Membership expiry check job scheduled to run daily at midnight (Asia/Kuala_Lumpur).');
};

module.exports = { scheduleMembershipCheck };
