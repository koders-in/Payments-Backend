function getWebhookPayload (data) {
  return {
    content: '**Payment received successfully! **',
    embeds: [
      {
        title: `Payment done by ***${data?.billing_details?.name}.***`,
        description: 'Payment details.',
        color: 1099008,
        fields: [
          {
            name: 'Amount',
            value: Math.round(data?.amount / 100) + ' ' + data?.currency,
            inline: true
          },
          {
            name: 'Client Name',
            value: data?.billing_details?.name,
            inline: true
          },
          {
            name: 'Phone Number',
            value: data?.billing_details?.phone || 'Not provided',
            inline: true
          },
          {
            name: 'Email',
            value: data?.billing_details?.email || 'Not provided',
            inline: true
          },
          {
            name: 'Address',
            value:
              Object.values(data?.billing_details?.address || {}).toString() ||
              'Not provided',
            inline: true
          },
          {
            name: 'Payment Status',
            value: data?.status,
            inline: true
          }
        ],
        timestamp: new Date()
      }
    ]
  }
}

module.exports = getWebhookPayload
