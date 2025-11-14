/**
 * VIVERSE WORLD FRAMEWORK - Generated file. v4.0.9
 * DO NOT MODIFY THIS FILE!
 * 
 * This file is automatically managed by the VIVERSE Framework.
 * Any changes made here will be overwritten.
 * 
 * To write your custom code, please edit:
 * scripts/index.mjs
 */

import * as pc from "playcanvas";
import { ViverseApp } from "@viverse/core"
import { setViverseEnv } from "@viverse/config";
import { LocalPlayerSystem, LocalAvatarModule, CameraModule, LocomotionModule, XrModule, InteractionModule } from "@viverse/local-player";
import { AccountSystem, AuthModule } from "@viverse/account";
import { UiSystem } from '@viverse/ui';
import { QuestSystem } from '@viverse/quest';
import { SystemName, ModuleName, XrLocomotionType } from "@viverse/types"
import viverseMetadataProvider from './viverse-metadata-provider.mjs';
import customScriptsProvider from './viverse-custom-scripts-provider.mjs';

setViverseEnv({
  assetDomain: "https://create-dev.viverse.com",
  viverseSdkUrl: "https://www.viverse.com/static-assets/viverse-sdk/index.umd.cjs",
  viverseAvatarDomain: "https://dts-vrstage.viverse.com",
  viverseSdkApiDomain: "https://sdk-api-stage.viverse.com/",
  htcAccountDomain: "account-stage.htcvive.com"
});

async function initializeApp() {
  const app = pc.Application.getApplication();
  const metadata = await viverseMetadataProvider(app);
  const customScripts = customScriptsProvider();

  customScripts.createBeforeInitCallback();

  const viverseApp = new ViverseApp(app, [
    {
      name: SystemName.Account,
      System: AccountSystem,
      options: {
        appId: metadata?.appId || '',
        modules: [
          { 
            name: ModuleName.Auth,
            Module: AuthModule
          }
        ],
      },
    },
    {
      name: SystemName.LocalPlayer,
      System: LocalPlayerSystem,
      options: {
        spawnPoints: [new pc.Vec3(0, 0, 0)],
         modules: [
          {
            name: ModuleName.LocalAvatar,
            Module: LocalAvatarModule,
          },
          {
            name: ModuleName.Camera,
            Module: CameraModule,
          },
          {
            name: ModuleName.Locomotion,
            Module: LocomotionModule,
            options: {
              canFly: true,
            },
          },
          {
            name: ModuleName.Xr,
            Module: XrModule,
            options: {
              locomotionType: {
                left: XrLocomotionType.Smooth,
                right: XrLocomotionType.Teleport,
              },
            },
          },
          {
            name: ModuleName.Interaction,
            Module: InteractionModule,
          },
        ],
      },
    },
    {
      name: SystemName.Ui,
      System: UiSystem,
    },
    {
      name: SystemName.Quest,
      System: QuestSystem,
      options: {
        quests: [
          ...customScripts.createQuest(),
          ...(metadata?.questConfig?.quests || []), // Remove this line to disable quests from the Quest UI Panel
        ],
        onAllQuestsComplete: metadata?.questConfig?.onAllQuestsComplete, // You can define custom callback for when all quests are completed
      },
    },
  ]);
 
  viverseApp.start().then(customScripts.createReadyCallback)
  window.viverseApp = viverseApp
}

// Start the app
initializeApp();
