// Retired: this legacy endpoint trusted browser-supplied totals.
export default function handler(_req: any, res: any) {
  return res.status(410).json({ error: 'Use o checkout Stripe da loja para iniciar o pagamento.' });
}
