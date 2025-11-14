
  var ExtensionEntry = pc.createScript('extensionEntry')

  ExtensionEntry.attributes.add('configs', {
    type: 'json',
    schema: [
      {
        name: 'main',
        type: 'string',
        default: '{}'
      },
      {
        name: 'theatre',
        type: 'string',
        default: '{}'
      },
      {
        name: 'quest',
        type: 'string',
        default: '{}'
      },
      {
        name: 'settings',
        type: 'string',
        default: '{}'
      },
    ],
  })

  ExtensionEntry.prototype.initialize = function () {
    console.log('[ExtensionEntry] initialize')
  }
