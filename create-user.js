import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const usuarioSchema = new mongoose.Schema({
  email: String,
  senha: String,
  nome: String,
  perfis: [String]
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

mongoose.connect('mongodb://nicolasimoes_db_user:XrTVL0IgoeDmsB8o@ac-uycyrst-shard-00-00.6noncis.mongodb.net:27017,ac-uycyrst-shard-00-01.6noncis.mongodb.net:27017,ac-uycyrst-shard-00-02.6noncis.mongodb.net:27017/?ssl=true&replicaSet=atlas-uz7dr9-shard-0&authSource=admin&appName=valelabs', {dbName: 'valelabs_microbio'}).then(async () => {
  const senha = 'Teste@123';
  const senhaHash = await bcrypt.hash(senha, 10);
  
  await Usuario.deleteOne({ email: 'teste@valelabs.com' });
  
  const usuario = new Usuario({
    email: 'teste@valelabs.com',
    senha: senhaHash,
    nome: 'Usuário Teste',
    perfis: ['analista']
  });
  
  await usuario.save();
  console.log('✅ Usuário criado: teste@valelabs.com');
  console.log('✅ Senha: Teste@123');
  process.exit(0);
}).catch(err => { 
  console.error('Erro:', err.message); 
  process.exit(1); 
});
