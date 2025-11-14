import { Script, Vec3, Entity, Component } from "playcanvas";
import { ViverseApp, Debugger } from '@viverse/core';
import { TriggerDispatcher, QuestAction, FadeInEntityAction, FadeOutEntityAction, DestroyEntityAction, PlayEntityAnimationAction, PlayEntityParticleSystemAction, ControlEntitySoundAction, PublishNotificationAction, PushEntityWithPhysicsAction, SetSpawnPointAction, TeleportPlayerAction, ToggleEntityAction, ToggleEntityCollisionAction, ToggleEntityRigidbodyAction, ShowToastMessageAction, } from '@viverse/extension';
import { ActionType, ActionToggleOption, ActionEntityFilterOption, ActionFadeTransitionOption, ActionPlaybackOption, ActionCommandOption, ActionQuestCommandOption, } from '@viverse/types';
/** @enum {string} */
const Type = {
    ToggleEntities: 'toggleEntities',
    ToggleComponent: 'toggleComponent',
    DestroyEntities: 'destroyEntities',
    FadeTransition: 'fadeTransition',
    PublishNotification: 'publishNotification',
    TeleportPlayer: 'teleportPlayer',
    PushEntity: 'pushEntity',
    SoundControl: 'soundControl',
    AnimationControl: 'animationControl',
    ParticleSystemControl: 'particleSystemControl',
    Quest: 'quest',
    SetSpawnPoint: 'setSpawnPoint',
    ShowToastMessage: 'showToastMessage',
};
/** @enum {string} */
const ToggleOption = {
    Enable: 'enable',
    Disable: 'disable',
    Toggle: 'toggle',
};
/** @enum {string} */
const CommandOption = {
    Collision: 'collision',
    RigidBody: 'rigidbody',
};
/** @enum {string} */
const EntityFilterOption = {
    Self: 'self',
    Tag: 'tag',
    TargetEntity: 'targetEntity',
};
/** @enum {string} */
const FadeTransitionOption = {
    FadeIn: 'fadeIn',
    FadeOut: 'fadeOut',
};
/** @enum {string} */
const PlaybackOption = {
    Play: 'play',
    Stop: 'stop',
};
/** @enum {string} */
const QuestCommandOption = {
    StartQuest: 'startQuest',
    ResetQuest: 'resetQuest',
    CompleteTask: 'completeTask',
    AddTaskProgress: 'addTaskProgress',
};
/** @interface */
class Action {
    /**
     * The trigger or condition name that activates this action.
     * Must match a defined Trigger or Condition name.
     * @attribute
     * @title Trigger / Condition
     * @type {string}
     */
    activation = '';
    /**
     * The type of action to perform when activated.
     * @attribute
     * @title Type
     * @type {Type}
     */
    type = Type.ToggleEntities;
    /**
     * If true, this action will only execute once
     * and then disable itself.
     * @attribute
     * @title Execute Once
     * @type {boolean}
     */
    once = false;
    /**
     * Delay (in seconds) before the action is executed
     * after being triggered.
     * @attribute
     * @title Delay
     * @type {number}
     */
    delay = 0;
    /**
     * Toggle behavior for entities/components.
     * @attribute
     * @title State
     * @type {ToggleOption}
     * @visibleif {type === 'toggleEntities'  || type === 'toggleComponent'}
     */
    state = ToggleOption.Toggle;
    /**
     * The entity filter to action.
     * @attribute
     * @title Entity Filter
     * @type {EntityFilterOption}
     * @visibleif {type === 'toggleEntities' || type === 'destroyEntities' || type === 'toggleComponent' || type === 'soundControl' || type === 'animationControl' || type === 'fadeTransition' || type === 'particleSystemControl' || type === 'pushEntity'}
     */
    entityFilter = EntityFilterOption.Self;
    /**
     * The entities with the tag will be affected
     * @attribute
     * @title Tag
     * @type {string}
     * @visibleif {(type === 'toggleEntities' || type === 'destroyEntities' || type === 'toggleComponent' || type === 'soundControl' || type === 'animationControl' || type === 'fadeTransition' || type === 'particleSystemControl' || type === 'pushEntity') && (entityFilter === 'tag')}
     */
    tagFilter = '';
    /**
     * Specific target entity (only if not applying to self or byTag).
     * @attribute
     * @title Target Entity
     * @type {Entity}
     * @visibleif {(type === 'toggleEntities' || type === 'destroyEntities' || type === 'toggleComponent' || type === 'soundControl' || type === 'animationControl' || type === 'fadeTransition' || type === 'particleSystemControl' || type === 'pushEntity') && (entityFilter === 'targetEntity')}
     */
    targetEntity;
    /**
     * Component type to toggle.
     * @attribute
     * @title Target Component
     * @type {CommandOption}
     * @visibleif {type === 'toggleComponent'}
     */
    targetComponent = CommandOption.Collision;
    /**
     * Fade transition type.
     * @attribute
     * @title Fade Type
     * @type {FadeTransitionOption}
     * @visibleif {type === 'fadeTransition'}
     */
    fadeTransition = FadeTransitionOption.FadeIn;
    /**
     * Duration (seconds).
     * @attribute
     * @title Duration
     * @type {number}
     * @visibleif {type === 'fadeTransition' || type === 'animationControl' || type === 'showToastMessage'}
     * @range [0.1, 10]
     */
    duration = 0.5;
    /**
     * Event name to fire.
     * @attribute
     * @title Event Name
     * @type {string}
     * @visibleif {type === 'publishNotification'}
     */
    eventName = '';
    /**
     * Teleport destination.
     * @attribute
     * @title Destination
     * @type {Vec3}
     * @visibleif {type === 'teleportPlayer'}
     */
    destination = new Vec3();
    /**
     * impulse vector to apply.
     * @attribute
     * @title Impulse
     * @type {Vec3}
     * @visibleif {type === 'pushEntity'}
     */
    impulse = new Vec3();
    /**
     * Playback option for sounds or animations.
     * @attribute
     * @title Playback
     * @type {PlaybackOption}
     * @visibleif {type === 'soundControl'}
     */
    playback = PlaybackOption.Play;
    /**
     * The name of the audio clip to control.
     * @attribute
     * @title Audio Name
     * @type {string}
     * @visibleif {type === 'soundControl'}
     */
    audioName = '';
    /**
     * The animation Name to control.
     * @attribute
     * @title Anim Name
     * @type {string}
     * @visibleif {type === 'animationControl'}
     */
    animName = '';
    /**
     * The quest name to control.
     * @attribute
     * @title Quest Name
     * @type {string}
     * @visibleif {type === 'quest'}
     */
    questName = '';
    /**
     * The quest command to execute.
     * @attribute
     * @title Command
     * @type {QuestCommandOption}
     * @visibleif {type === 'quest'}
     */
    questCommand = QuestCommandOption.StartQuest;
    /**
     * The task name within the quest (if applicable).
     * @attribute
     * @title Task Name
     * @type {string}
     * @visibleif {type === 'quest' && (questCommand === 'completeTask' || questCommand === 'addTaskProgress') && questName !== 'none' && questName !== ''}
     */
    taskName = '';
    /**
     * The title of the toast message to show.
     * @attribute
     * @title Toast Message Title
     * @type {string}
     * @visibleif {type === 'showToastMessage'}
     */
    toastMessageTitle = '';
    /**
     * The description of the toast message to show.
     * @attribute
     * @title Toast Message Description
     * @type {string}
     * @visibleif {type === 'showToastMessage'}
     */
    toastMessageDescription = '';
    /**
     * Multiple spawn points.
     * @attribute
     * @title Spawn Point List
     * @type {Vec3[]}
     * @visibleif {type === 'setSpawnPoint'}
     */
    spawnPoints = [];
}
export class ViverseAction extends Script {
    static scriptName = 'viverseAction';
    /**
     * Set how many actions this entity should have. Start with 0 and increase as needed.
     * @attribute
     * @title Action Count
     * @type {number}
     */
    actionCount = 0;
    /**
     * Configure multiple actions for this entity. The array size is controlled by Action Count above.
     * @attribute
     * @title Action List
     * @type {Action[]}
     * @visibleif {actionCount > 0}
     */
    actions = [];
    _listeners = [];
    _dispatcher = TriggerDispatcher.getInstance();
    initialize() {
        if (!this.actions || this.actions.length <= 0)
            return;
        this._listeners = [];
        const actionMap = this._resolveActionMap();
        this._addEventListeners(actionMap);
        this.entity.on('destroy', () => {
            this._listeners?.forEach(({ activation, handler }) => {
                this._dispatcher.off(activation, handler);
            });
            this._listeners.length = 0;
        });
    }
    /**
     * Called every frame while the script is enabled.
     * @param {number} dt - Delta time since last frame.
     */
    update() { }
    _resolveActionMap() {
        const eventMap = new Map();
        this.actions.forEach((action) => {
            const key = action.activation;
            const list = eventMap.get(key) || [];
            list.push(action);
            eventMap.set(key, list);
        });
        return eventMap;
    }
    _addEventListeners(actionMap) {
        actionMap.forEach((actions, activation) => {
            actions.forEach((action) => {
                const handler = () => this._onActionTriggered(action);
                const eventName = this._dispatcher.getTriggerEventName(activation);
                if (action.once) {
                    this._dispatcher.once(eventName, handler);
                }
                else {
                    this._dispatcher.on(eventName, handler);
                }
                this._listeners.push({ activation, handler });
            });
        });
    }
    _onActionTriggered(action) {
        const execute = this._getExecution(action);
        if (!execute)
            return;
        if (action.delay > 0) {
            setTimeout(() => execute(action), action.delay * 1000);
        }
        else {
            execute(action);
        }
    }
    _getExecution(action) {
        switch (action.type) {
            case Type.ToggleEntities:
                return this._executeToggleEntities.bind(this);
            case Type.ToggleComponent:
                return this._executeToggleComponent.bind(this);
            case Type.DestroyEntities:
                return this._executeDestroyEntities.bind(this);
            case Type.FadeTransition:
                return this._executeFadeTransition.bind(this);
            case Type.PublishNotification:
                return this._executePublishNotification.bind(this);
            case Type.TeleportPlayer:
                return this._executeTeleportPlayer.bind(this);
            case Type.PushEntity:
                return this._executePushEntity.bind(this);
            case Type.SoundControl:
                return this._executeSoundControl.bind(this);
            case Type.AnimationControl:
                return this._executeAnimationControl.bind(this);
            case Type.ParticleSystemControl:
                return this._executeParticleSystemControl.bind(this);
            case Type.Quest:
                return this._executeQuest.bind(this);
            case Type.SetSpawnPoint:
                return this._executeSetSpawnPoint.bind(this);
            case Type.ShowToastMessage:
                return this._executeShowToastMessage.bind(this);
            default:
                Debugger.warn(`[ViverseAction] Unknown action type: ${action.type}`);
                return null;
        }
    }
    _executeToggleEntities(action) {
        const viverseApp = ViverseApp.getApplication();
        if (!viverseApp) {
            Debugger.error('[ViverseAction] ViverseApp is not initialized.');
            return;
        }
        const targets = this._resolveTargets(action);
        targets.forEach((target) => {
            const actionInstance = new ToggleEntityAction(viverseApp, {
                entity: target,
                state: action.state,
            });
            actionInstance.execute();
        });
    }
    _executeToggleComponent(action) {
        const viverseApp = ViverseApp.getApplication();
        if (!viverseApp) {
            Debugger.error('[ViverseAction] ViverseApp is not initialized.');
            return;
        }
        const targets = this._resolveTargets(action);
        targets.forEach((target) => {
            let actionInstance = null;
            const config = {
                entity: target,
                state: action.state,
            };
            if (action.targetComponent === CommandOption.Collision) {
                actionInstance = new ToggleEntityCollisionAction(viverseApp, config);
            }
            else if (action.targetComponent === CommandOption.RigidBody) {
                actionInstance = new ToggleEntityRigidbodyAction(viverseApp, config);
            }
            if (actionInstance !== null)
                actionInstance.execute();
        });
    }
    _executeDestroyEntities(action) {
        const viverseApp = ViverseApp.getApplication();
        if (!viverseApp) {
            Debugger.error('[ViverseAction] ViverseApp is not initialized.');
            return;
        }
        const targets = this._resolveTargets(action);
        targets.forEach((target) => {
            const actionInstance = new DestroyEntityAction(viverseApp, {
                entity: target,
            });
            actionInstance.execute();
        });
    }
    _executeFadeTransition(action) {
        const viverseApp = ViverseApp.getApplication();
        if (!viverseApp) {
            Debugger.error('[ViverseAction] ViverseApp is not initialized.');
            return;
        }
        const targets = this._resolveTargets(action);
        targets.forEach((target) => {
            let actionInstance = null;
            const config = {
                entity: target,
                duration: action.duration,
            };
            if (action.fadeTransition === FadeTransitionOption.FadeIn) {
                actionInstance = new FadeInEntityAction(viverseApp, config);
            }
            else if (action.fadeTransition === FadeTransitionOption.FadeOut) {
                actionInstance = new FadeOutEntityAction(viverseApp, config);
            }
            if (actionInstance !== null)
                actionInstance.execute();
        });
    }
    _executePublishNotification(action) {
        if (!action.eventName || action.eventName.trim() === '') {
            Debugger.warn(`[ViverseAction] Publish notification action on entity '${this.entity.name}' has no eventName and will be ignored.`);
            return;
        }
        const eventName = action.eventName.trim();
        const viverseApp = ViverseApp.getApplication();
        if (!viverseApp) {
            Debugger.error('[ViverseAction] ViverseApp is not initialized.');
            return;
        }
        const actionInstance = new PublishNotificationAction(viverseApp, {
            notificationName: eventName,
        });
        actionInstance.execute();
    }
    _executeTeleportPlayer(action) {
        const viverseApp = ViverseApp.getApplication();
        if (!viverseApp) {
            Debugger.error('[ViverseAction] ViverseApp is not initialized.');
            return;
        }
        const actionInstance = new TeleportPlayerAction(viverseApp, {
            position: action.destination,
        });
        actionInstance.execute();
    }
    _executePushEntity(action) {
        const viverseApp = ViverseApp.getApplication();
        if (!viverseApp) {
            Debugger.error('[ViverseAction] ViverseApp is not initialized.');
            return;
        }
        const targets = this._resolveTargets(action);
        targets.forEach((target) => {
            const actionInstance = new PushEntityWithPhysicsAction(viverseApp, {
                entity: target,
                impulse: action.impulse,
            });
            actionInstance.execute();
        });
    }
    _executeSoundControl(action) {
        const viverseApp = ViverseApp.getApplication();
        if (!viverseApp) {
            Debugger.error('[ViverseAction] ViverseApp is not initialized.');
            return;
        }
        const targets = this._resolveTargets(action);
        targets.forEach((target) => {
            const actionInstance = new ControlEntitySoundAction(viverseApp, {
                entity: target,
                soundName: action.audioName,
                state: action.playback,
            });
            actionInstance.execute();
        });
    }
    _executeAnimationControl(action) {
        const viverseApp = ViverseApp.getApplication();
        if (!viverseApp) {
            Debugger.error('[ViverseAction] ViverseApp is not initialized.');
            return;
        }
        const targets = this._resolveTargets(action);
        targets.forEach((target) => {
            const actionInstance = new PlayEntityAnimationAction(viverseApp, {
                entity: target,
                stateName: action.animName,
                transitionDuration: action.duration,
            });
            actionInstance.execute();
        });
    }
    _executeParticleSystemControl(action) {
        const viverseApp = ViverseApp.getApplication();
        if (!viverseApp) {
            Debugger.error('[ViverseAction] ViverseApp is not initialized.');
            return;
        }
        const targets = this._resolveTargets(action);
        targets.forEach((target) => {
            const actionInstance = new PlayEntityParticleSystemAction(viverseApp, {
                entity: target,
            });
            actionInstance.execute();
        });
    }
    _executeQuest(action) {
        const viverseApp = ViverseApp.getApplication();
        if (!viverseApp) {
            Debugger.error('[ViverseAction] ViverseApp is not initialized.');
            return;
        }
        const questInstance = new QuestAction(viverseApp, {
            type: action.questCommand,
            questName: action.questName,
            taskName: action.taskName,
            ...(action.questCommand === QuestCommandOption.AddTaskProgress ? { increment: 1 } : {}), // Default increment by 1 if not specified
        });
        return questInstance.execute();
    }
    _executeSetSpawnPoint(action) {
        const viverseApp = ViverseApp.getApplication();
        if (!viverseApp) {
            Debugger.error('[ViverseAction] ViverseApp is not initialized.');
            return;
        }
        const actionInstance = new SetSpawnPointAction(viverseApp, {
            spawnPoints: action.spawnPoints,
        });
        actionInstance.execute();
    }
    _executeShowToastMessage(action) {
        const viverseApp = ViverseApp.getApplication();
        if (!viverseApp) {
            Debugger.error('[ViverseAction] ViverseApp is not initialized.');
            return;
        }
        const actionInstance = new ShowToastMessageAction(viverseApp, {
            title: action.toastMessageTitle,
            description: action.toastMessageDescription,
            duration: action.duration,
        });
        actionInstance.execute();
    }
    _resolveTargets(action) {
        let targets = [];
        if (action.entityFilter === EntityFilterOption.Self) {
            targets.push(this.entity);
        }
        else if (action.entityFilter === EntityFilterOption.Tag) {
            if (!action.tagFilter || action.tagFilter.trim() === '') {
                Debugger.warn(`[ViverseAction] Action of type '${action.type}' on entity '${this.entity.name}' is set to 'tag' but has no tag specified.`);
                return targets;
            }
            targets = this.app.root.findByTag(action.tagFilter);
        }
        else if (action.entityFilter === EntityFilterOption.TargetEntity && action.targetEntity) {
            targets.push(action.targetEntity);
        }
        return targets;
    }
}
// HACK: This block is purely for ensuring type-only imports are preserved in the build output.
// The attribute-parser needs these imports to correctly parse the script attributes.
// This code will never run and will be tree-shaken from the final application bundle.
if (
// eslint-disable-next-line no-constant-condition
false) {
    Debugger.log(Script, Vec3, Entity, Component);
}
