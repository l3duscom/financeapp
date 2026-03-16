/**
 * Seeder de dados mock para o usuário eduardosantos_777@icloud.com
 *
 * Popula: transacoes, cartoes de credito, faturas importadas, extratos importados
 *
 * Uso: node scripts/seed-mock-data.mjs <senha>
 *
 * Exemplo: node scripts/seed-mock-data.mjs MinhaSenha123
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, addDoc, collection, Timestamp } from 'firebase/firestore';

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

const TARGET_EMAIL = 'eduardosantos_777@icloud.com';
const PASSWORD = process.argv[2];

if (!PASSWORD) {
  console.error('Uso: node scripts/seed-mock-data.mjs <senha>');
  console.error('Exemplo: node scripts/seed-mock-data.mjs MinhaSenha123');
  process.exit(1);
}

// ===== Helpers =====

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(month, year) {
  const day = randomInt(1, 28);
  return new Date(year, month, day);
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function ts(date) {
  return Timestamp.fromDate(date);
}

// ===== Cartoes de Credito =====

const creditCards = [
  {
    name: 'Nubank',
    lastDigits: '8734',
    brand: 'mastercard',
    color: '#8b5cf6',
    limit: 12000,
    closingDay: 3,
    dueDay: 10,
  },
  {
    name: 'Inter',
    lastDigits: '5521',
    brand: 'mastercard',
    color: '#f97316',
    limit: 8000,
    closingDay: 7,
    dueDay: 15,
  },
  {
    name: 'C6 Bank',
    lastDigits: '1199',
    brand: 'visa',
    color: '#171717',
    limit: 5000,
    closingDay: 15,
    dueDay: 22,
  },
  {
    name: 'Itau Platinum',
    lastDigits: '4402',
    brand: 'visa',
    color: '#ea580c',
    limit: 15000,
    closingDay: 10,
    dueDay: 17,
  },
];

// ===== Transacoes de Cartao (por fatura) =====

function generateCardTransactions(card, month, year) {
  const txs = [];

  const cardExpenses = [
    { desc: 'Mercado Livre', cat: 'Outros', min: 50, max: 350 },
    { desc: 'Amazon', cat: 'Outros', min: 30, max: 250 },
    { desc: 'iFood', cat: 'Alimentacao', min: 15, max: 80 },
    { desc: 'Uber', cat: 'Transporte', min: 10, max: 45 },
    { desc: 'Spotify', cat: 'Assinaturas', min: 21, max: 21 },
    { desc: 'Netflix', cat: 'Assinaturas', min: 39, max: 39 },
    { desc: 'Farmacia Drogasil', cat: 'Saude', min: 25, max: 120 },
    { desc: 'Posto Shell', cat: 'Transporte', min: 100, max: 280 },
    { desc: 'Supermercado Extra', cat: 'Supermercado', min: 80, max: 350 },
    { desc: 'Restaurante Outback', cat: 'Alimentacao', min: 70, max: 180 },
    { desc: 'Lojas Renner', cat: 'Roupas', min: 80, max: 300 },
    { desc: 'Drogaria Sao Paulo', cat: 'Saude', min: 20, max: 90 },
    { desc: 'Cinemark', cat: 'Lazer', min: 30, max: 60 },
    { desc: 'Rappi', cat: 'Alimentacao', min: 20, max: 70 },
    { desc: 'Padaria Real', cat: 'Alimentacao', min: 10, max: 30 },
    { desc: 'Pet Shop Cobasi', cat: 'Outros', min: 40, max: 150 },
    { desc: 'Livraria Cultura', cat: 'Educacao', min: 30, max: 120 },
    { desc: 'Steam Games', cat: 'Lazer', min: 20, max: 200 },
  ];

  const count = randomInt(5, 12);
  for (let i = 0; i < count; i++) {
    const exp = randomItem(cardExpenses);
    txs.push({
      description: `${exp.desc} - ${card.name}`,
      amount: randomInt(exp.min, exp.max),
      type: 'expense',
      category: exp.cat,
      account: card.name,
      date: randomDate(month, year),
    });
  }

  return txs;
}

// ===== Transacoes bancarias (extrato) =====

function generateBankTransactions(month, year) {
  const txs = [];

  // Receitas
  txs.push({
    description: 'Salario - Empresa XYZ',
    amount: 8500,
    type: 'income',
    category: 'Salario',
    account: 'Nubank',
    date: new Date(year, month, 5),
  });

  if (Math.random() > 0.4) {
    txs.push({
      description: 'Freelance - Projeto Web',
      amount: randomInt(800, 3000),
      type: 'income',
      category: 'Freelance',
      account: 'Nubank',
      date: randomDate(month, year),
    });
  }

  if (Math.random() > 0.6) {
    txs.push({
      description: 'Rendimento poupanca',
      amount: randomInt(50, 200),
      type: 'income',
      category: 'Investimentos',
      account: 'Itau',
      date: new Date(year, month, 1),
    });
  }

  // PIX recebido
  if (Math.random() > 0.5) {
    txs.push({
      description: 'PIX recebido - Reembolso',
      amount: randomInt(30, 250),
      type: 'income',
      category: 'Outros',
      account: 'Nubank',
      date: randomDate(month, year),
    });
  }

  // Despesas fixas
  txs.push(
    { description: 'Aluguel', amount: 2200, type: 'expense', category: 'Moradia', account: 'Nubank', date: new Date(year, month, 10) },
    { description: 'Condominio', amount: 450, type: 'expense', category: 'Moradia', account: 'Nubank', date: new Date(year, month, 10) },
    { description: 'Energia Eletrica - ENEL', amount: randomInt(120, 280), type: 'expense', category: 'Moradia', account: 'Nubank', date: new Date(year, month, 18) },
    { description: 'Internet Vivo Fibra', amount: 149, type: 'expense', category: 'Assinaturas', account: 'Nubank', date: new Date(year, month, 15) },
    { description: 'Academia SmartFit', amount: 109, type: 'expense', category: 'Saude', account: 'Nubank', date: new Date(year, month, 1) },
    { description: 'Plano de Saude Unimed', amount: 380, type: 'expense', category: 'Saude', account: 'Nubank', date: new Date(year, month, 20) },
  );

  // Despesas variaveis
  const varExpenses = [
    { desc: 'Supermercado Pao de Acucar', cat: 'Supermercado', min: 120, max: 400 },
    { desc: 'Feira livre', cat: 'Alimentacao', min: 30, max: 80 },
    { desc: 'Restaurante almoço', cat: 'Alimentacao', min: 25, max: 60 },
    { desc: 'Padaria', cat: 'Alimentacao', min: 8, max: 25 },
    { desc: 'Uber / 99', cat: 'Transporte', min: 12, max: 50 },
    { desc: 'Gasolina', cat: 'Transporte', min: 150, max: 320 },
    { desc: 'Estacionamento', cat: 'Transporte', min: 10, max: 30 },
    { desc: 'Farmacia', cat: 'Saude', min: 20, max: 80 },
    { desc: 'Happy hour', cat: 'Lazer', min: 40, max: 120 },
    { desc: 'Cinema', cat: 'Lazer', min: 30, max: 60 },
    { desc: 'Lavanderia', cat: 'Outros', min: 30, max: 60 },
    { desc: 'PIX - Diversos', cat: 'Outros', min: 20, max: 100 },
  ];

  for (const exp of varExpenses) {
    const count = randomInt(0, 3);
    for (let i = 0; i < count; i++) {
      txs.push({
        description: exp.desc,
        amount: randomInt(exp.min, exp.max),
        type: 'expense',
        category: exp.cat,
        account: Math.random() > 0.3 ? 'Nubank' : 'Carteira',
        date: randomDate(month, year),
      });
    }
  }

  return txs;
}

// ===== Faturas Importadas (metadados sem arquivo real) =====

function generateInvoices(uid, cards) {
  const invoices = [];
  const now = new Date();

  for (const card of cards) {
    // Faturas dos ultimos 4 meses
    for (let i = 3; i >= 0; i--) {
      let m = now.getMonth() - i;
      let y = now.getFullYear();
      if (m < 0) { m += 12; y--; }

      invoices.push({
        userId: uid,
        fileName: `fatura_${card.name.toLowerCase().replace(/\s+/g, '_')}_${String(m + 1).padStart(2, '0')}_${y}.pdf`,
        fileUrl: `https://firebasestorage.googleapis.com/v0/b/financeapp-bd974.firebasestorage.app/o/invoices%2F${uid}%2Fmock_${card.lastDigits}_${m}_${y}.pdf?alt=media`,
        storagePath: `invoices/${uid}/mock_${card.lastDigits}_${m}_${y}.pdf`,
        fileSize: randomInt(50000, 500000),
        fileType: 'application/pdf',
        cardName: card.name,
        month: m,
        year: y,
        uploadedAt: Timestamp.fromDate(new Date(y, m, card.dueDay + 2)),
      });
    }
  }

  return invoices;
}

// ===== Parcelas (Installments) =====

const installments = [
  {
    description: 'iPhone 15 Pro',
    category: 'Outros',
    totalAmount: 7199,
    installmentAmount: 599.92,
    totalInstallments: 12,
    paidInstallments: 4,
    cardName: 'Nubank',
    startDate: new Date(2025, 10, 15),
  },
  {
    description: 'Curso Alura Anual',
    category: 'Educacao',
    totalAmount: 1068,
    installmentAmount: 89,
    totalInstallments: 12,
    paidInstallments: 6,
    cardName: 'Inter',
    startDate: new Date(2025, 8, 1),
  },
  {
    description: 'Geladeira Brastemp',
    category: 'Moradia',
    totalAmount: 4500,
    installmentAmount: 450,
    totalInstallments: 10,
    paidInstallments: 3,
    cardName: 'Itau Platinum',
    startDate: new Date(2025, 11, 20),
  },
  {
    description: 'Tenis Nike Air Max',
    category: 'Roupas',
    totalAmount: 899,
    installmentAmount: 149.84,
    totalInstallments: 6,
    paidInstallments: 2,
    cardName: 'C6 Bank',
    startDate: new Date(2026, 0, 10),
  },
];

// ===== Main Seeder =====

async function seed() {
  console.log('='.repeat(55));
  console.log('  SEEDER DE DADOS MOCK');
  console.log('  Usuario: ' + TARGET_EMAIL);
  console.log('='.repeat(55));
  console.log('');

  // 1. Login
  console.log('Fazendo login...');
  let uid;
  try {
    const cred = await signInWithEmailAndPassword(auth, TARGET_EMAIL, PASSWORD);
    uid = cred.user.uid;
    console.log('Login OK - UID: ' + uid);
  } catch (err) {
    console.error('Erro no login:', err.message);
    console.error('Verifique a senha e tente novamente.');
    process.exit(1);
  }

  // 2. Cartoes de credito
  console.log('\n--- Cartoes de Credito ---');
  const cardIds = [];
  for (const card of creditCards) {
    const ref = await addDoc(collection(db, 'creditCards'), {
      ...card,
      userId: uid,
      createdAt: Timestamp.now(),
    });
    cardIds.push(ref.id);
    console.log('  + ' + card.name + ' (' + card.brand + ' ***' + card.lastDigits + ')');
  }
  console.log(creditCards.length + ' cartoes criados');

  // 3. Transacoes bancarias (extrato) - ultimos 6 meses
  console.log('\n--- Transacoes Bancarias (Extrato) ---');
  const now = new Date();
  let totalBankTxs = 0;

  for (let i = 5; i >= 0; i--) {
    let m = now.getMonth() - i;
    let y = now.getFullYear();
    if (m < 0) { m += 12; y--; }

    const txs = generateBankTransactions(m, y);
    for (const tx of txs) {
      await addDoc(collection(db, 'transactions'), {
        ...tx,
        userId: uid,
        date: ts(tx.date),
        createdAt: Timestamp.now(),
      });
    }
    totalBankTxs += txs.length;
    console.log('  ' + String(m + 1).padStart(2, '0') + '/' + y + ': ' + txs.length + ' transacoes');
  }
  console.log(totalBankTxs + ' transacoes bancarias criadas');

  // 4. Transacoes de cartao - ultimos 4 meses
  console.log('\n--- Transacoes de Cartao ---');
  let totalCardTxs = 0;

  for (const card of creditCards) {
    for (let i = 3; i >= 0; i--) {
      let m = now.getMonth() - i;
      let y = now.getFullYear();
      if (m < 0) { m += 12; y--; }

      const txs = generateCardTransactions(card, m, y);
      for (const tx of txs) {
        await addDoc(collection(db, 'transactions'), {
          ...tx,
          userId: uid,
          date: ts(tx.date),
          createdAt: Timestamp.now(),
        });
      }
      totalCardTxs += txs.length;
    }
    console.log('  ' + card.name + ': transacoes geradas');
  }
  console.log(totalCardTxs + ' transacoes de cartao criadas');

  // 5. Faturas importadas (metadados)
  console.log('\n--- Faturas Importadas ---');
  const invoices = generateInvoices(uid, creditCards);
  for (const inv of invoices) {
    await addDoc(collection(db, 'invoices'), inv);
  }
  console.log(invoices.length + ' faturas importadas criadas');

  // 6. Parcelas
  console.log('\n--- Parcelas ---');
  for (const inst of installments) {
    await addDoc(collection(db, 'installments'), {
      ...inst,
      userId: uid,
      startDate: ts(inst.startDate),
      createdAt: Timestamp.now(),
    });
    console.log('  + ' + inst.description + ' (' + inst.paidInstallments + '/' + inst.totalInstallments + 'x)');
  }
  console.log(installments.length + ' parcelas criadas');

  // Resumo
  console.log('\n' + '='.repeat(55));
  console.log('  SEED CONCLUIDO!');
  console.log('='.repeat(55));
  console.log('');
  console.log('  Cartoes:        ' + creditCards.length);
  console.log('  Tx bancarias:   ' + totalBankTxs);
  console.log('  Tx cartao:      ' + totalCardTxs);
  console.log('  Faturas:        ' + invoices.length);
  console.log('  Parcelas:       ' + installments.length);
  console.log('  Total geral:    ' + (totalBankTxs + totalCardTxs) + ' transacoes');
  console.log('');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
