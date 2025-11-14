import {
  QuestAction,
  FadeInEntityAction,
  FadeOutEntityAction,
  DestroyEntityAction,
  PlayEntityAnimationAction,
  ControlEntitySoundAction,
  PublishNotificationAction,
  PushEntityWithPhysicsAction,
  SetSpawnPointAction,
  TeleportPlayerAction,
  ToggleEntityAction,
  ToggleEntityCollisionAction,
  ToggleEntityRigidbodyAction,
} from '@viverse/extension'
import { ViverseApp } from '@viverse/core'
import { ActionType, ActionCommandOption, ActionFadeTransitionOption } from '@viverse/types'

// This function creates an executable function from the action data object
function createActionExecutor(actionData, pcApp) {
  if (!actionData || !actionData.type) {
    return () => {}
  }
  if (!pcApp) {
    console.error('[VIVERSE-MetaData-Provider] pcApp is required to create action executor!')
    return () => {}
  }

  let ActionClass = null
  const { type, ...params } = actionData

  switch (type) {
    case ActionType.ToggleEntities:
      ActionClass = ToggleEntityAction
      break
    case ActionType.ToggleComponent:
      if (actionData.targetComponent === ActionCommandOption.Collision) {
        ActionClass = ToggleEntityCollisionAction
      } else if (actionData.targetComponent === ActionCommandOption.RigidBody) {
        ActionClass = ToggleEntityRigidbodyAction
      }
      break
    case ActionType.DestroyEntities:
      ActionClass = DestroyEntityAction
      break
    case ActionType.FadeTransition:
      if (actionData.fadeTransition === ActionFadeTransitionOption.FadeIn) {
        ActionClass = FadeInEntityAction
      } else if (actionData.fadeTransition === ActionFadeTransitionOption.FadeOut) {
        ActionClass = FadeOutEntityAction
      }
      break
    case ActionType.PublishNotification:
      ActionClass = PublishNotificationAction
      break
    case ActionType.TeleportPlayer:
      ActionClass = TeleportPlayerAction
      break
    case ActionType.PushEntity:
      ActionClass = PushEntityWithPhysicsAction
      break
    case ActionType.SoundControl:
      ActionClass = ControlEntitySoundAction
      break
    case ActionType.AnimationControl:
      ActionClass = PlayEntityAnimationAction
      break
    case ActionType.Quest:
      ActionClass = QuestAction
      break
    case ActionType.SetSpawnPoint:
      ActionClass = SetSpawnPointAction
      break
    default:
      console.warn(`[VIVERSE-MetaData-Provider] Unknown or unhandled action type: ${type}`)
      return () => {}
  }

  if (!ActionClass) {
    console.warn(
      `[VIVERSE-MetaData-Provider] No specific Action Class found for actionData:`,
      actionData,
    )
    return () => {}
  }

  // The returned function will be executed by QuestSystem at runtime
  return () => {
    const { targetEntity: targetGuid } = params
    const config = {
      notificationName: actionData.eventName,
      position: actionData.destination,
      soundName: actionData.audioName,
      state: actionData.playback,
      stateName: actionData.animName,
      transitionDuration: actionData.duration,
      type: actionData.questCommand,
      ...params,
    }
    if (targetGuid) {
      const targetEntity = pcApp.root.findByGuid(targetGuid)
      if (targetEntity) {
        config.entity = targetEntity
        new ActionClass(ViverseApp.getApplication(), config).execute()
      } else {
        console.error(
          `[VIVERSE-MetaData-Provider] Could not find target entity with GUID: ${targetGuid}`,
        )
      }
    } else {
      // Handle actions that don't require a target entity
      new ActionClass(ViverseApp.getApplication(), config).execute()
    }
  }
}

async function viverseMetadataProvider(pcApp) {
  const asset = pcApp.assets.find('viverse-metadata.json')
  if (!asset) {
    console.error('[VIVERSE-MetaData-Provider] viverse-metadata.json not found!')
    return null
  }

  if (!asset.resource) {
    await new Promise((resolve) => asset.once('load', resolve))
  }

  const rawMetadata = asset.resource
  if (!rawMetadata) {
    return null
  }

  // Deep clone the config to avoid modifying the original asset resource
  const metadataToProcess = JSON.parse(JSON.stringify(rawMetadata))
  const { questConfig: configToProcess, ...restMetadata } = metadataToProcess

  if (!configToProcess) {
    return rawMetadata
  }

  // Process quests
  if (configToProcess.quests && Array.isArray(configToProcess.quests)) {
    configToProcess.quests.forEach((quest) => {
      if (quest.options.onComplete) {
        quest.options.onComplete = createActionExecutor(quest.options.onComplete, pcApp)
      }
      if (quest.options.tasks && Array.isArray(quest.options.tasks)) {
        quest.options.tasks.forEach((task) => {
          if (task.options.onComplete) {
            task.options.onComplete = createActionExecutor(task.options.onComplete, pcApp)
          }
        })
      }
    })
  }

  // Process global onAllQuestsComplete
  if (configToProcess.onAllQuestsComplete) {
    configToProcess.onAllQuestsComplete = createActionExecutor(
      configToProcess.onAllQuestsComplete,
      pcApp,
    )
  }

  return {
    ...restMetadata,
    questConfig: configToProcess,
  }
}

export default viverseMetadataProvider
