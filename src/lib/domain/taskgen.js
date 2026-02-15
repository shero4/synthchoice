/**
 * Task Generation Helpers
 * Generate choice tasks for experiments
 */

/**
 * Shuffle array in place (Fisher-Yates)
 * @param {Array} array
 * @returns {Array}
 */
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get number of alternatives per task based on format
 * @param {string} choiceFormat
 * @returns {number}
 */
function getAlternativesPerTask(choiceFormat) {
  switch (choiceFormat) {
    case "ABC":
    case "ABC_NONE":
      return 3;
    case "AB":
    case "AB_NONE":
    default:
      return 2;
  }
}

/**
 * Generate all possible alternative combinations
 * @param {string[]} alternativeIds
 * @param {number} size - combination size
 * @returns {string[][]}
 */
function getCombinations(alternativeIds, size) {
  const results = [];

  function combine(start, combo) {
    if (combo.length === size) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i < alternativeIds.length; i++) {
      combo.push(alternativeIds[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }

  combine(0, []);
  return results;
}

/**
 * Generate tasks for an experiment
 * @param {Object} params
 * @param {Object[]} params.agents - Agent objects
 * @param {Object[]} params.alternatives - Alternative objects
 * @param {string} params.choiceFormat - Choice format
 * @param {Object} params.taskPlan - Task plan settings
 * @returns {Object[]} Array of task objects
 */
export function generateTasks({ agents, alternatives, choiceFormat, taskPlan }) {
  const tasks = [];
  const alternativeIds = alternatives.map((a) => a.id);
  const altsPerTask = getAlternativesPerTask(choiceFormat);
  const tasksPerAgent = taskPlan?.tasksPerAgent || 10;
  const randomizeOrder = taskPlan?.randomizeOrder !== false;
  const holdoutCount = taskPlan?.includeHoldouts || 0;
  const repeatCount = taskPlan?.includeRepeats || 0;

  // Generate all possible combinations
  const allCombinations = getCombinations(alternativeIds, altsPerTask);

  if (allCombinations.length === 0) {
    console.warn("Not enough alternatives for the choice format");
    return [];
  }

  // For each agent, generate their tasks
  agents.forEach((agent) => {
    const agentTasks = [];
    const regularTaskCount = tasksPerAgent - holdoutCount - repeatCount;

    // Generate regular tasks
    for (let i = 0; i < regularTaskCount; i++) {
      // Pick a random combination
      const combination = allCombinations[i % allCombinations.length];
      const shownAlternatives = randomizeOrder ? shuffle(combination) : [...combination];

      agentTasks.push({
        agentId: agent.id,
        shownAlternatives,
        isHoldout: false,
        isRepeatOf: null,
      });
    }

    // Generate holdout tasks
    for (let i = 0; i < holdoutCount; i++) {
      const combination = allCombinations[(regularTaskCount + i) % allCombinations.length];
      const shownAlternatives = randomizeOrder ? shuffle(combination) : [...combination];

      agentTasks.push({
        agentId: agent.id,
        shownAlternatives,
        isHoldout: true,
        isRepeatOf: null,
      });
    }

    // Generate repeat tasks (copies of earlier tasks)
    for (let i = 0; i < repeatCount; i++) {
      if (agentTasks.length > 0) {
        const sourceIndex = i % Math.min(regularTaskCount, agentTasks.length);
        const sourceTask = agentTasks[sourceIndex];
        const shownAlternatives = randomizeOrder
          ? shuffle([...sourceTask.shownAlternatives])
          : [...sourceTask.shownAlternatives];

        agentTasks.push({
          agentId: agent.id,
          shownAlternatives,
          isHoldout: false,
          isRepeatOf: `${agent.id}_task_${sourceIndex}`,
        });
      }
    }

    // Shuffle all tasks for this agent
    const shuffledTasks = shuffle(agentTasks);

    // Add task IDs and push to main array
    shuffledTasks.forEach((task, index) => {
      tasks.push({
        ...task,
        id: `${agent.id}_task_${index}`,
      });
    });
  });

  return tasks;
}

/**
 * Get task statistics
 * @param {Object[]} tasks
 * @returns {Object}
 */
export function getTaskStats(tasks) {
  const regular = tasks.filter((t) => !t.isHoldout && !t.isRepeatOf).length;
  const holdouts = tasks.filter((t) => t.isHoldout).length;
  const repeats = tasks.filter((t) => t.isRepeatOf).length;
  const uniqueAgents = new Set(tasks.map((t) => t.agentId)).size;

  return {
    total: tasks.length,
    regular,
    holdouts,
    repeats,
    uniqueAgents,
  };
}
