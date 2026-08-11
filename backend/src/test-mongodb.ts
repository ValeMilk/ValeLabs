import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI não definida');
  process.exit(1);
}

console.log('🔄 Testando conexão com MongoDB Atlas...');
console.log(`📍 Connection String: ${MONGO_URI.substring(0, 80)}...`);

async function testConnection() {
  try {
    // Conectar com opções de retry
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority',
      authSource: 'admin',
    });

    console.log('✅ Conectado ao MongoDB Atlas com sucesso!');

    // Testar ping
    const admin = mongoose.connection.db?.admin();
    if (admin) {
      const response = await admin.ping();
      console.log('✅ Ping respondeu:', response);
    }

    // Listar databases
    const databases = await mongoose.connection.db?.admin().listDatabases();
    console.log(`\n📦 Bancos de dados (${databases?.databases.length || 0}):`);
    databases?.databases.forEach((db: any) => {
      console.log(`   - ${db.name}`);
    });

    await mongoose.disconnect();
    console.log('\n🎉 TESTE PASSOU! Conexão funcionando!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ ERRO:');
    console.error(error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Possível causa: Username/Password incorretos');
      console.error('   → Verificar: nicolasimoes_db_user e senha no Atlas');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.error('\n💡 Possível causa: DNS ou Firewall bloqueando');
      console.error('   → Verificar: Cluster existe? Está rodando?');
      console.error('   → Verificar: Network Access no Atlas (IP whitelist)');
      console.error('   → Sua rede/ISP pode estar bloqueando MongoDB SRV');
    } else if (error.message.includes('Timed out')) {
      console.error('\n💡 Possível causa: Timeout na conexão');
      console.error('   → Verificar: IP do VPS está em Network Access?');
    }
    
    process.exit(1);
  }
}

testConnection();
