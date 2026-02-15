import { CHARACTER_STATES } from "../config";

export async function runCharacterTaskCycle({
  runtime,
  character,
  task,
  timeoutMs,
}) {
  runtime.updateCharacterState(character.id, CHARACTER_STATES.INTRO_MESSAGE);
  await runtime.withActionTimeout("intro_message", timeoutMs, (signal) =>
    runtime.characterSayMessage(character.id, task.introMessage, undefined, {
      signal,
    }),
  );

  runtime.updateCharacterState(
    character.id,
    CHARACTER_STATES.WALKING_TO_STATION,
  );
  await runtime.withActionTimeout("walk_to_station", timeoutMs, (signal) =>
    runtime.characterWalkToStation(character.id, task.stationId, { signal }),
  );

  runtime.updateCharacterState(character.id, CHARACTER_STATES.THINKING);
  await runtime.withActionTimeout("thinking", timeoutMs, (signal) =>
    runtime.characterThink(character.id, { signal }),
  );

  runtime.updateCharacterState(character.id, CHARACTER_STATES.CHOOSING);
  const decision = await runtime.withActionTimeout(
    "choosing",
    timeoutMs,
    (signal) => runtime.characterChooseOption(character.id, task, { signal }),
  );

  runtime.updateCharacterState(character.id, CHARACTER_STATES.REASON_MESSAGE);
  await runtime.withActionTimeout("reason_message", timeoutMs, (signal) =>
    runtime.characterGiveReason(character.id, decision.reason, { signal }),
  );

  runtime.updateCharacterState(
    character.id,
    CHARACTER_STATES.WALKING_TO_CHOICE,
  );
  await runtime.withActionTimeout("walk_to_choice", timeoutMs, (signal) =>
    runtime.characterWalkToChoice(
      character.id,
      task.stationId,
      decision.chosenOption?.id,
      { signal },
    ),
  );

  runtime.updateCharacterState(character.id, CHARACTER_STATES.RETURNING);
  await runtime.withActionTimeout("return_to_spawn", timeoutMs, (signal) =>
    runtime.characterReturnToSpawn(character.id, { signal }),
  );

  runtime.updateCharacterState(character.id, CHARACTER_STATES.IDLE);
  return decision;
}
