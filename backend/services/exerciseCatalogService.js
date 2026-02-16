const fs = require('node:fs/promises');
const path = require('node:path');

const EXERCISES_PATH = path.join(__dirname, '../data/exercises_v2.json');
const SCHEMA_PATH = path.join(__dirname, '../data/schema_v2.json');

let cache = null;

function readEnumArray(schema, propertyPath) {
  const segments = propertyPath.split('.');
  let cursor = schema;
  for (const segment of segments) {
    cursor = cursor?.[segment];
    if (!cursor) return [];
  }
  return Array.isArray(cursor) ? cursor : [];
}

function validateExerciseRecords(exercises = []) {
  const required = ['id', 'name', 'modality', 'doseType', 'equipment', 'primaryMuscles'];
  const idSet = new Set();
  for (const ex of exercises) {
    for (const key of required) {
      if (ex?.[key] === undefined || ex?.[key] === null) {
        throw new Error(`Invalid exercise record: missing "${key}" on ${ex?.name || ex?.id || 'unknown exercise'}`);
      }
    }
    if (idSet.has(ex.id)) {
      throw new Error(`Duplicate exercise id found: ${ex.id}`);
    }
    idSet.add(ex.id);
  }
}

async function loadCatalog() {
  if (cache) return cache;

  const [exercisesRaw, schemaRaw] = await Promise.all([
    fs.readFile(EXERCISES_PATH, 'utf8'),
    fs.readFile(SCHEMA_PATH, 'utf8'),
  ]);

  const exercises = JSON.parse(exercisesRaw);
  const schema = JSON.parse(schemaRaw);

  validateExerciseRecords(exercises);

  const byId = new Map();
  const byName = new Map();
  for (const ex of exercises) {
    byId.set(ex.id, ex);
    byName.set(ex.name.toLowerCase(), ex);
  }

  const options = {
    equipment: readEnumArray(schema, 'items.properties.equipment.items.enum'),
    muscles: readEnumArray(schema, 'items.properties.primaryMuscles.items.enum'),
    modalities: readEnumArray(schema, 'items.properties.modality.enum'),
    doseTypes: readEnumArray(schema, 'items.properties.doseType.enum'),
  };

  cache = { exercises, schema, byId, byName, options };
  return cache;
}

async function getExercises() {
  const catalog = await loadCatalog();
  return catalog.exercises;
}

async function getExerciseById(exerciseId) {
  if (!exerciseId) return null;
  const catalog = await loadCatalog();
  return catalog.byId.get(exerciseId) || null;
}

async function getExerciseByName(name) {
  if (!name) return null;
  const catalog = await loadCatalog();
  return catalog.byName.get(String(name).toLowerCase()) || null;
}

async function getCatalogForClient() {
  const catalog = await loadCatalog();
  return {
    exercises: catalog.exercises,
    options: catalog.options,
  };
}

function clearCatalogCache() {
  cache = null;
}

module.exports = {
  getExercises,
  getExerciseById,
  getExerciseByName,
  getCatalogForClient,
  clearCatalogCache,
};
