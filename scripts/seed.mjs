/**
 * Seeder - Cria um usuário de teste no Firebase Auth e popula o Firestore
 * 
 * Uso: node scripts/seed.mjs
 * 
 * Credenciais do usuário de teste:
 *   Email: teste@financeapp.com
 *   Senha: Teste@123
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, addDoc, collection, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC1TM6wJUbWugZPc9G2Q4fRSfTzTosS2jc',
  authDomain: 'financeapp-bd974.firebaseapp.com',
  projectId: 'financeapp-bd974',
  storageBucket: 'financeapp-bd974.firebasestorage.app',
  messagingSenderId: '494531196667',
  appId: '1:494531196667:web:0513fb177c5f0a6e53e25e',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const TEST_EMAIL = 'teste@financeapp.com';
const TEST_PASSWORD = 'Teste@123';
const TEST_NAME = 'Usuário Teste';

// ===== Dados de Seed =====

const categories = [
  { name: 'Alimentação', icon: 'utensils', color: '#ef4444', type: 'expense', budget: 800 },
  { name: 'Transporte', icon: 'car', color: '#f97316', type: 'expense', budget: 500 },
  { name: 'Moradia', icon: 'home', color: '#8b5cf6', type: 'expense', budget: 2000 },
  { name: 'Saúde', icon: 'heart', color: '#ec4899', type: 'expense', budget: 300 },
  { name: 'Educação', icon: 'book', color: '#3b82f6', type: 'expense', budget: 400 },
  { name: 'Lazer', icon: 'gamepad', color: '#06b6d4', type: 'expense', budget: 300 },
  { name: 'Roupas', icon: 'shirt', color: '#d946ef', type: 'expense', budget: 200 },
  { name: 'Supermercado', icon: 'shopping-cart', color: '#22c55e', type: 'expense', budget: 600 },
  { name: 'Assinaturas', icon: 'tv', color: '#6366f1', type: 'expense', budget: 150 },
  { name: 'Outros', icon: 'circle', color: '#64748b', type: 'expense', budget: 200 },
  { name: 'Salário', icon: 'banknote', color: '#10b981', type: 'income', budget: 0 },
  { name: 'Freelance', icon: 'laptop', color: '#14b8a6', type: 'income', budget: 0 },
  { name: 'Investimentos', icon: 'trending-up', color: '#f59e0b', type: 'income', budget: 0 },
  { name: 'Presente', icon: 'gift', color: '#a855f7', type: 'income', budget: 0 },
];

const accounts = [
  { name: 'Carteira', type: 'cash', balance: 150, color: '#10b981', icon: 'wallet' },
  { name: 'Nubank', type: 'checking', balance: 3200, color: '#8b5cf6', icon: 'building' },
  { name: 'Itaú', type: 'savings', balance: 15000, color: '#f97316', icon: 'landmark' },
];

function randomDate(month, year) {
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(year, month, day);
}

function generateTransactions(month, year) {
  const txs = [];

  // Receitas
  txs.push({
    description: 'Salário',
    amount: 6500,
    type: 'income',
    category: 'Salário',
    account: 'Nubank',
    date: new Date(year, month, 5),
  });

  if (Math.random() > 0.5) {
    txs.push({
      description: 'Freelance design',
      amount: Math.floor(Math.random() * 2000) + 500,
      type: 'income',
      category: 'Freelance',
      account: 'Nubank',
      date: randomDate(month, year),
    });
  }

  // Despesas fixas
  txs.push(
    { description: 'Aluguel', amount: 1800, type: 'expense', category: 'Moradia', account: 'Nubank', date: new Date(year, month, 10) },
    { description: 'Condomínio', amount: 350, type: 'expense', category: 'Moradia', account: 'Nubank', date: new Date(year, month, 10) },
    { description: 'Internet', amount: 120, type: 'expense', category: 'Assinaturas', account: 'Nubank', date: new Date(year, month, 15) },
    { description: 'Netflix + Spotify', amount: 55, type: 'expense', category: 'Assinaturas', account: 'Nubank', date: new Date(year, month, 8) },
    { description: 'Academia', amount: 99, type: 'expense', category: 'Saúde', account: 'Nubank', date: new Date(year, month, 1) },
  );

  // Despesas variáveis
  const variableExpenses = [
    { desc: 'Supermercado Semanal', cat: 'Supermercado', min: 150, max: 300 },
    { desc: 'iFood / Delivery', cat: 'Alimentação', min: 30, max: 80 },
    { desc: 'Restaurante', cat: 'Alimentação', min: 50, max: 150 },
    { desc: 'Uber / 99', cat: 'Transporte', min: 20, max: 60 },
    { desc: 'Gasolina', cat: 'Transporte', min: 150, max: 300 },
    { desc: 'Farmácia', cat: 'Saúde', min: 30, max: 100 },
    { desc: 'Cinema / Lazer', cat: 'Lazer', min: 40, max: 120 },
    { desc: 'Compras online', cat: 'Roupas', min: 50, max: 250 },
    { desc: 'Livro / Curso', cat: 'Educação', min: 30, max: 200 },
  ];

  for (const exp of variableExpenses) {
    const count = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < count; i++) {
      txs.push({
        description: exp.desc,
        amount: Math.floor(Math.random() * (exp.max - exp.min)) + exp.min,
        type: 'expense',
        category: exp.cat,
        account: Math.random() > 0.3 ? 'Nubank' : 'Carteira',
        date: randomDate(month, year),
      });
    }
  }

  return txs;
}

const goals = [
  {
    name: 'Reserva de emergência',
    targetAmount: 20000,
    currentAmount: 8500,
    category: 'emergency',
    icon: 'shield',
    color: '#3b82f6',
    deadline: new Date(2026, 11, 31),
  },
  {
    name: 'Viagem Europa 2027',
    targetAmount: 15000,
    currentAmount: 3200,
    category: 'travel',
    icon: 'plane',
    color: '#06b6d4',
    deadline: new Date(2027, 5, 1),
  },
  {
    name: 'MacBook Pro',
    targetAmount: 12000,
    currentAmount: 6800,
    category: 'purchase',
    icon: 'shopping-bag',
    color: '#f59e0b',
    deadline: new Date(2026, 8, 1),
  },
];

// ===== Main Seeder =====

async function seed() {
  console.log('🌱 Iniciando seed...\n');

  // 1. Criar ou logar usuário
  let uid;
  try {
    console.log(`📧 Criando usuário: ${TEST_EMAIL}`);
    const cred = await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    uid = cred.user.uid;
    console.log(`✅ Usuário criado: ${uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('⚠️  Usuário já existe, fazendo login...');
      const cred = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
      uid = cred.user.uid;
      console.log(`✅ Login: ${uid}`);
    } else {
      throw err;
    }
  }

  // 2. Perfil
  console.log('\n👤 Criando perfil...');
  await setDoc(doc(db, 'users', uid), {
    name: TEST_NAME,
    email: TEST_EMAIL,
    createdAt: Timestamp.now(),
    subscription: { active: true, plan: 'annual' },
  });
  console.log('✅ Perfil criado');

  // 3. Categorias
  console.log('\n📂 Criando categorias...');
  for (const cat of categories) {
    await addDoc(collection(db, 'categories'), { ...cat, userId: uid });
  }
  console.log(`✅ ${categories.length} categorias criadas`);

  // 4. Contas
  console.log('\n🏦 Criando contas...');
  for (const acc of accounts) {
    await addDoc(collection(db, 'accounts'), { ...acc, userId: uid });
  }
  console.log(`✅ ${accounts.length} contas criadas`);

  // 5. Transações (últimos 3 meses)
  console.log('\n💰 Criando transações...');
  const now = new Date();
  let totalTxs = 0;
  for (let i = 2; i >= 0; i--) {
    const m = now.getMonth() - i;
    const y = now.getFullYear();
    const adjMonth = m < 0 ? m + 12 : m;
    const adjYear = m < 0 ? y - 1 : y;

    const txs = generateTransactions(adjMonth, adjYear);
    for (const tx of txs) {
      await addDoc(collection(db, 'transactions'), {
        ...tx,
        userId: uid,
        date: Timestamp.fromDate(tx.date),
        createdAt: Timestamp.now(),
      });
    }
    totalTxs += txs.length;
    console.log(`  📅 ${adjMonth + 1}/${adjYear}: ${txs.length} transações`);
  }
  console.log(`✅ ${totalTxs} transações criadas`);

  // 6. Metas
  console.log('\n🎯 Criando metas...');
  for (const goal of goals) {
    await addDoc(collection(db, 'goals'), {
      ...goal,
      userId: uid,
      deadline: Timestamp.fromDate(goal.deadline),
      createdAt: Timestamp.now(),
    });
  }
  console.log(`✅ ${goals.length} metas criadas`);

  // 7. Orçamentos (mês atual)
  console.log('\n📊 Criando orçamentos...');
  const expenseCats = categories.filter(c => c.type === 'expense' && c.budget > 0);
  for (const cat of expenseCats) {
    await addDoc(collection(db, 'budgets'), {
      userId: uid,
      category: cat.name,
      limit: cat.budget,
      month: now.getMonth(),
      year: now.getFullYear(),
    });
  }
  console.log(`✅ ${expenseCats.length} orçamentos criados`);

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Seed concluído com sucesso!');
  console.log('='.repeat(50));
  console.log(`\n📧 Email: ${TEST_EMAIL}`);
  console.log(`🔑 Senha: ${TEST_PASSWORD}`);
  console.log(`🆔 UID:   ${uid}`);
  console.log('\nAbra http://localhost:3000/login e use as credenciais acima.\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
