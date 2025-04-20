const admin = require('firebase-admin');

async function sendNewBookingNotificationToTrainer(trainerFcmToken, bookingDetails, targetUserUid) {
  // Ensure all data fields are strings
  const message = {
    notification: {
      title: 'New Booking Request',
      body: `Client ${bookingDetails.clientId?.name || 'A client'} has requested a booking for ${bookingDetails.serviceType}.`, // Access client's name if available
    },
    data: {
      type: 'new_booking_request',
      appointmentId: bookingDetails._id ? bookingDetails._id.toString() : '',
      clientName: bookingDetails.clientId?.name ? bookingDetails.clientId.name.toString() : 'Client', // Correctly access client's name for data
      serviceType: bookingDetails.serviceType ? bookingDetails.serviceType.toString() : '',
      appointmentDate: bookingDetails.appointmentDate ? bookingDetails.appointmentDate.toISOString() : '', // Use toISOString for Date
      appointmentTime: JSON.stringify(bookingDetails.appointmentTime || {}),
      targetFcmToken: trainerFcmToken,
      targetUserUid: targetUserUid, 
    },
    token: trainerFcmToken,
  };

  try {
    const messageResponse = await admin.messaging().send(message);
    console.log('Successfully sent message:', messageResponse);
    return messageResponse;
  } catch (error) {
    console.log('Error sending message:', error);
    throw error;
  }
}

async function sendBookingConfirmationNotificationToClient(clientFcmToken, bookingDetails, targetUserUid) {
  const message = {
    notification: {
      title: 'Booking Confirmed',
      body: `Your booking for ${bookingDetails.serviceType} has been confirmed by the trainer.`,
    },
    data: {
      type: 'booking_confirmed',
      appointmentId: bookingDetails._id ? bookingDetails._id.toString() : '',
      serviceType: bookingDetails.serviceType ? bookingDetails.serviceType.toString() : '',
      appointmentDate: bookingDetails.appointmentDate ? bookingDetails.appointmentDate.toString() : '',
      appointmentTime: JSON.stringify(bookingDetails.appointmentTime || {}),
      targetFcmToken: clientFcmToken,
      targetUserUid: targetUserUid, 
    },
    token: clientFcmToken,
  };

  try {
    const messageResponse = await admin.messaging().send(message);
    console.log('Successfully sent message:', messageResponse);
    return messageResponse;
  } catch (error) {
    console.log('Error sending message:', error);
    throw error;
  }
}

async function sendBookingRejectedNotificationToClient(clientFcmToken, bookingDetails, targetUserUid) {
  const message = {
    notification: {
      title: 'Booking Rejected',
      body: `Your booking for ${bookingDetails.serviceType} has been rejected by the trainer.`,
    },
    data: {
      type: 'booking_rejected',
      appointmentId: bookingDetails._id ? bookingDetails._id.toString() : '',
      serviceType: bookingDetails.serviceType ? bookingDetails.serviceType.toString() : '',
      appointmentDate: bookingDetails.appointmentDate ? bookingDetails.appointmentDate.toString() : '',
      appointmentTime: JSON.stringify(bookingDetails.appointmentTime || {}),
      targetFcmToken: clientFcmToken,
      targetUserUid: targetUserUid,
    },
    token: clientFcmToken,
  };

  try {
    const messageResponse = await admin.messaging().send(message);
    console.log('Successfully sent message:', messageResponse);
    return messageResponse;
  } catch (error) {
    console.log('Error sending message:', error);
    throw error;
  }
}

async function sendBookingCancellationNotificationToTrainer(trainerFcmToken, bookingDetails, targetUserUid) {
  const message = {
    notification: {
      title: 'Booking Cancelled',
      body: `Your booking for ${bookingDetails.serviceType} has been cancelled by the trainer.`,
    },
    data: {
      type: 'booking_cancelled',
      appointmentId: bookingDetails._id ? bookingDetails._id.toString() : '',
      serviceType: bookingDetails.serviceType ? bookingDetails.serviceType.toString() : '',
      appointmentDate: bookingDetails.appointmentDate ? bookingDetails.appointmentDate.toString() : '',
      appointmentTime: JSON.stringify(bookingDetails.appointmentTime || {}),
      targetFcmToken: trainerFcmToken,
      targetUserUid: targetUserUid,
    },
    token: trainerFcmToken,
  };

  try {
    const messageResponse = await admin.messaging().send(message);
    console.log('Successfully sent message:', messageResponse);
    return messageResponse;
  } catch (error) {
    console.log('Error sending message:', error);
    throw error;
  }
}

module.exports = {
  sendNewBookingNotificationToTrainer,
  sendBookingConfirmationNotificationToClient,
  sendBookingRejectedNotificationToClient,
  sendBookingCancellationNotificationToTrainer,
};