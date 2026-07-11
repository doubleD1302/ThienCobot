import { Skill } from './models/Skill.js';
import { sequelize } from './database.js';

try {
  const sk = await Skill.findOne();
  if (sk) {
    console.log('sk.id:', sk.id);
    console.log('sk.moTa:', sk.moTa);
    console.log('sk.mo_ta:', sk.mo_ta);
    console.log('sk.toJSON():', sk.toJSON());
  } else {
    console.log('No skills found in database.');
  }
} catch (e) {
  console.error(e);
} finally {
  await sequelize.close();
}
