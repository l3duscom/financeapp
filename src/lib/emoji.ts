// Brand logos: [regex, domain for Clearbit Logo API]
const BRAND_LOGOS: [RegExp, string][] = [
  // Streaming & entretenimento
  [/netflix/i, 'netflix.com'],
  [/spotify/i, 'spotify.com'],
  [/disney\s*\+|disney\s*plus/i, 'disneyplus.com'],
  [/hbo\s*max|hbmax|hboma|helphbo/i, 'hbomax.com'],
  [/youtube|yt\s*premium/i, 'youtube.com'],
  [/prime\s*video/i, 'primevideo.com'],
  [/twitch/i, 'twitch.tv'],
  [/apple|applecombill/i, 'apple.com'],
  [/deezer/i, 'deezer.com'],
  [/tidal/i, 'tidal.com'],
  [/globo\s*play|globoplay/i, 'globoplay.globo.com'],
  [/paramount/i, 'paramountplus.com'],
  [/crunchyroll/i, 'crunchyroll.com'],
  [/steam/i, 'store.steampowered.com'],
  [/playstation|psn/i, 'playstation.com'],
  [/xbox/i, 'xbox.com'],
  [/nintendo/i, 'nintendo.com'],
  // Social & tech
  [/facebook|facebk|meta\s*ads/i, 'facebook.com'],
  [/instagram/i, 'instagram.com'],
  [/whatsapp/i, 'whatsapp.com'],
  [/twitter|x\.com/i, 'x.com'],
  [/tiktok/i, 'tiktok.com'],
  [/linkedin/i, 'linkedin.com'],
  [/google(?!\s*pay)/i, 'google.com'],
  [/microsoft|office\s*365/i, 'microsoft.com'],
  [/adobe|photoshop|creative\s*cloud/i, 'adobe.com'],
  [/dropbox/i, 'dropbox.com'],
  [/notion/i, 'notion.so'],
  [/chatgpt|openai/i, 'openai.com'],
  [/canva/i, 'canva.com'],
  [/zoom/i, 'zoom.us'],
  [/slack/i, 'slack.com'],
  // Delivery & food
  [/ifood/i, 'ifood.com.br'],
  [/rappi/i, 'rappi.com.br'],
  [/uber\s*eats/i, 'ubereats.com'],
  [/mcdonald|mc\s*donald/i, 'mcdonalds.com'],
  [/burger\s*king/i, 'burgerking.com.br'],
  [/subway/i, 'subway.com'],
  [/kfc/i, 'kfc.com'],
  [/starbucks/i, 'starbucks.com'],
  [/outback/i, 'outback.com.br'],
  // Transporte
  [/uber(?!\s*eats)/i, 'uber.com'],
  [/99\s*(?!food)/i, '99app.com'],
  [/cabify/i, 'cabify.com'],
  [/gol\b/i, 'voegol.com.br'],
  [/latam/i, 'latamairlines.com'],
  [/azul\b/i, 'voeazul.com.br'],
  // Compras
  [/amazon/i, 'amazon.com.br'],
  [/mercado\s*livre|mercadol/i, 'mercadolivre.com.br'],
  [/shopee/i, 'shopee.com.br'],
  [/magalu|magazine\s*luiza/i, 'magazineluiza.com.br'],
  [/shein/i, 'shein.com'],
  [/aliexpress/i, 'aliexpress.com'],
  [/americanas/i, 'americanas.com.br'],
  [/casas\s*bahia/i, 'casasbahia.com.br'],
  [/kabum/i, 'kabum.com.br'],
  [/pichau/i, 'pichau.com.br'],
  [/renner/i, 'lojasrenner.com.br'],
  [/riachuelo/i, 'riachuelo.com.br'],
  [/zara/i, 'zara.com'],
  // Saúde
  [/droga\s*raia|raia/i, 'drogaraia.com.br'],
  [/drogasil/i, 'drogasil.com.br'],
  [/pague\s*menos/i, 'paguemenos.com.br'],
  [/smart\s*fit/i, 'smartfit.com.br'],
  // Telecom
  [/claro/i, 'claro.com.br'],
  [/vivo/i, 'vivo.com.br'],
  [/tim\b/i, 'tim.com.br'],
  // Bancos & pagamento
  [/nubank/i, 'nubank.com.br'],
  [/inter\b/i, 'bancointer.com.br'],
  [/itau|itaú/i, 'itau.com.br'],
  [/bradesco/i, 'bradesco.com.br'],
  [/santander/i, 'santander.com.br'],
  [/c6\s*bank/i, 'c6bank.com.br'],
  [/picpay/i, 'picpay.com'],
  [/mercado\s*pago/i, 'mercadopago.com.br'],
  [/pay\s*pal|paypal/i, 'paypal.com'],
  [/google\s*pay/i, 'pay.google.com'],
  // Educação
  [/udemy/i, 'udemy.com'],
  [/alura/i, 'alura.com.br'],
  [/coursera/i, 'coursera.org'],
  [/duolingo/i, 'duolingo.com'],
  // Viagem
  [/airbnb/i, 'airbnb.com'],
  [/booking/i, 'booking.com'],
];

const EMOJI_MAP: [RegExp, string][] = [
  // Streaming & entretenimento
  [/netflix/i, '🍿'],
  [/spotify/i, '🎵'],
  [/disney/i, '🏰'],
  [/hbo|hboma|helphbo/i, '🎬'],
  [/youtube|yt/i, '📺'],
  [/prime\s*video|amazon\s*prime/i, '📦'],
  [/twitch/i, '🎮'],
  [/apple|applecombill/i, '🍎'],
  [/deezer|tidal/i, '🎧'],
  [/steam|playstation|xbox|game/i, '🕹️'],
  [/cinema/i, '🎞️'],
  [/globo\s*play|globoplay/i, '📺'],
  // Alimentação
  [/ifood|rappi|uber\s*eats|delivery|99\s*food/i, '🛵'],
  [/mercado|supermercado|carrefour|pão\s*de\s*açúcar|extra|atacadão|assaí|bigbox/i, '🛒'],
  [/restaurante|almoço|jantar|lanchonete|burger|pizza|sushi|churrasco/i, '🍽️'],
  [/padaria|pão|bakery|confeitaria/i, '🥐'],
  [/café|cafeteria|starbucks|coffee/i, '☕'],
  [/bar\b|cerveja|chopp|happy\s*hour/i, '🍺'],
  [/açougue|carne|frigorífico/i, '🥩'],
  [/hortifruti|verdura|feira|sacolão/i, '🥬'],
  [/doce|chocolate|sorvet/i, '🍫'],
  [/mcdonald|mc\s*donald|burger\s*king|bk|subway|kfc/i, '🍔'],
  // Transporte
  [/uber(?!\s*eats)|99\s*(?!food)|cabify|lyft|táxi|taxi/i, '🚗'],
  [/gasolina|combustível|posto|shell|ipiranga|br\b|abastec/i, '⛽'],
  [/estacionamento|parking|zona\s*azul/i, '🅿️'],
  [/pedágio|pedagio/i, '🛣️'],
  [/oficina|mecânico|borracharia|pneu/i, '🔧'],
  [/ônibus|bus|metro|metrô|trem|cptm|brt/i, '🚌'],
  [/avião|voo|gol\b|latam|azul\b|passagem\s*aér/i, '✈️'],
  // Saúde
  [/farmácia|drogaria|droga\s*raia|pague\s*menos|drogasil|remédio/i, '💊'],
  [/médico|consulta|hospital|clínica|exame|lab/i, '🏥'],
  [/dentista|odonto/i, '🦷'],
  [/academia|gym|smart\s*fit|crossfit|musculação/i, '🏋️'],
  [/psicólogo|terapia|psiquiatra/i, '🧠'],
  [/ótica|óculos|lentes/i, '👓'],
  // Casa & utilidades
  [/luz|enel|cpfl|cemig|eletricidade|energia/i, '💡'],
  [/água|sabesp|saneamento|copasa/i, '💧'],
  [/gás|comgás|ultragaz/i, '🔥'],
  [/internet|fibra|claro|vivo|tim|oi\b|wifi/i, '📡'],
  [/celular|telefone|recarga/i, '📱'],
  [/aluguel|condomínio|iptu|condominio/i, '🏠'],
  [/seguro/i, '🛡️'],
  [/limpeza|faxina|diarista/i, '🧹'],
  // Compras & varejo
  [/amazon|shopee|mercado\s*livre|magalu|magazine/i, '📦'],
  [/shein|zara|renner|c&a|riachuelo|roupa/i, '👗'],
  [/sapato|tênis|calçado/i, '👟'],
  [/pet\s*shop|vet|veterinário|ração/i, '🐾'],
  [/livraria|livro|kindle/i, '📚'],
  [/presente|gift/i, '🎁'],
  [/joia|relógio|acessório/i, '💍'],
  [/eletrônico|kabum|pichau|terabyte/i, '💻'],
  [/móveis|decoração|tok\s*stok|etna/i, '🛋️'],
  // Educação
  [/escola|faculdade|universidade|curso|aula|mensalidade/i, '🎓'],
  [/inglês|idioma|duolingo/i, '🌎'],
  [/udemy|alura|coursera|cursor/i, '💡'],
  // Lazer & viagem
  [/hotel|airbnb|booking|hosped/i, '🏨'],
  [/viagem|trip|passeio/i, '🌴'],
  [/praia/i, '🏖️'],
  [/parque|ingresso|show|teatro|evento/i, '🎪'],
  [/salão|cabelo|barbearia|barber/i, '💇'],
  [/manicure|unha|estética|skin/i, '💅'],
  // Financeiro
  [/pix|transferência|transfer/i, '💸'],
  [/pagamento\s*recebido|recebimento/i, '💰'],
  [/saque|caixa/i, '🏧'],
  [/imposto|taxa|tarifa|anuidade|iof/i, '📋'],
  [/investimento|ação|fundo|tesouro|cripto|bitcoin/i, '📈'],
  [/assinatura|subscri/i, '🔄'],
  [/salário|salario|holerite|pagamento/i, '💰'],
  [/freelance|freela/i, '💼'],
  // Crianças
  [/brinquedo|toy/i, '🧸'],
  [/fralda|bebê|baby/i, '👶'],
];

const CATEGORY_EMOJI: Record<string, string> = {
  'alimentação': '🍴',
  'mercado': '🛒',
  'moradia': '🏠',
  'transporte': '🚗',
  'saúde': '❤️',
  'educação': '📖',
  'lazer': '🎯',
  'utilidades': '⚡',
  'vestuário': '👕',
  'outros': '📌',
  'fatura': '💳',
  'salário': '💰',
  'freelance': '💼',
  'investimentos': '📈',
};

export function getTransactionEmoji(description: string, category: string): string {
  const text = `${description} ${category}`.toLowerCase();
  for (const [pattern, emoji] of EMOJI_MAP) {
    if (pattern.test(text)) return emoji;
  }
  const catLower = category.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (catLower.includes(key)) return emoji;
  }
  return '💳';
}

export function getTransactionBrandLogo(description: string): string | null {
  const text = description.toLowerCase();
  for (const [pattern, domain] of BRAND_LOGOS) {
    if (pattern.test(text)) {
      return `https://logo.clearbit.com/${domain}`;
    }
  }
  return null;
}

export function getTransactionBrandLogoFallback(description: string): string | null {
  const text = description.toLowerCase();
  for (const [pattern, domain] of BRAND_LOGOS) {
    if (pattern.test(text)) {
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }
  }
  return null;
}
