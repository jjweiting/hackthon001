/**
 * Custom Script Index - Entry point for Creator custom code
 *
 * This file serves as the main entry point for creators to write custom scripts
 * in their Viverse projects. It provides two key areas for customization:
 *
 * 1. createQuest() - Define custom quest configurations and logic
 *    - Configure quest names, tasks, and completion callbacks
 *    - Return an array of quest objects with their respective options
 *
 * 2. onBeforeInit() - Lifecycle hook before VIVERSE Framework initialization
 *    - Executes before VIVERSE Framework starts
 *    - Handle early setup, configuration, or environment preparation
 *
 * 3. onReady() - Lifecycle hook after VIVERSE Framework is ready
 *    - Executes after VIVERSE Framework has started and is ready
 *    - Handle player setup and initial game state
 *    - Execute any required setup procedures when the app starts
 *
 * Usage:
 * - Modify the createQuest() function to add your custom quests
 * - Modify the onBeforeInit() function to add pre-initialization logic
 * - Modify the onReady() function to add initialization logic
 * - All functions are automatically called by the Viverse framework
 */

import { ViverseApp } from '@viverse/core'

export const createQuest = () => {
  return [
    // Example:
    // {
    //   name: 'quest-unique-name-1',
    //   options: {
    //     title: 'My Quest 1',
    //     description: 'Quest 1 description',
    //     autoStart: true,
    //     tasks: [
    //       {
    //         name: 'task-unique-name-1',
    //         options: {
    //           description: 'Task 1 description',
    //           type: CompletionType.Progress, // import { CompletionType } from '@viverse/types'
    //           totalProgress: 3,
    //           onComplete: () => console.log('Task 1 completed!'),
    //         },
    //       },
    //     ],
    //     onComplete: () => console.log('Quest 1 completed!')
    //   }
    // }
  ]
}

export const onBeforeInit = async () => {
  // Pre-initialization logic here
  // This runs before VIVERSE Framework starts
  console.log('onBeforeInit: VIVERSE Framework is about to initialize')
}

export const onReady = async () => {
  const viverseApp = ViverseApp.getApplication()
  if (viverseApp.systems.localPlayer) {
    await viverseApp.systems.localPlayer.addPlayer()
  }
}
