/**
 * Task Generation Helpers
 * Generate choice tasks for experiments
 * 
 * Simplified: Each agent evaluates all pairwise comparisons of alternatives.
 * For N alternatives, there are C(N,2) = N*(N-1)/2 pairs.
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
 * Generate all pairwise combinations of alternatives
 * @param {string[]} alternativeIds
 * @returns {string[][]} Array of [altA, altB] pairs
 */
function getPairwiseCombinations(alternativeIds) {
  const pairs = [];
  for (let i = 0; i < alternativeIds.length; i++) {
    for (let j = i + 1; j < alternativeIds.length; j++) {
      pairs.push([alternativeIds[i], alternativeIds[j]]);
    }
  }
  return pairs;
}

/**
 * Generate tasks for an experiment
 * Each agent gets all possible pairwise comparisons (A/B format)
 * 
 * @param {Object} params
 * @param {Object[]} params.agents - Agent objects
 * @param {Object[]} params.alternatives - Alternative objects
 * @returns {Object[]} Array of task objects
 */
export function generateTasks({ agents, alternatives }) {
  const tasks = [];
  const alternativeIds = alternatives.map((a) => a.id);
  
  // Get all pairwise combinations
  const allCombinations = getPairwiseCombinations(alternativeIds);

  if (allCombinations.length === 0) {
    console.warn("Not enough alternatives - need at least 2");
    return [];
  }

  // For each agent, generate tasks for all pairwise comparisons
  agents.forEach((agent) => {
    // Each agent evaluates all possible pairs (randomized order within each pair)
    allCombinations.forEach((combination, index) => {
      // Randomize which alternative appears first
      const shownAlternatives = shuffle([...combination]);

      tasks.push({
        id: `${agent.id}_task_${index}`,
        agentId: agent.id,
        shownAlternatives,
        isHoldout: false,
        isRepeatOf: null,
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
  const uniqueAgents = new Set(tasks.map((t) => t.agentId)).size;
  const tasksPerAgent = uniqueAgents > 0 ? tasks.length / uniqueAgents : 0;

  return {
    total: tasks.length,
    uniqueAgents,
    tasksPerAgent,
  };
}

/**
 * Calculate number of tasks that will be generated
 * @param {number} numAlternatives - Number of alternatives
 * @param {number} numAgents - Number of agents
 * @returns {number} Total tasks
 */
export function calculateTotalTasks(numAlternatives, numAgents) {
  // C(n,2) pairs per agent
  const pairsPerAgent = (numAlternatives * (numAlternatives - 1)) / 2;
  return pairsPerAgent * numAgents;
}
