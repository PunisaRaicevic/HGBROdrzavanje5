#!/usr/bin/env tsx

/**
 * Password Hash Generator
 * 
 * Generiše bcrypt hash za lozinku koju možeš direktno ubaciti u Supabase.
 * 
 * Upotreba:
 *   npm run generate-hash <lozinka>
 * 
 * Primer:
 *   npm run generate-hash mypassword123
 */

import bcrypt from 'bcryptjs';

async function generateHash() {
  const password = process.argv[2];

  if (!password) {
    console.error('\n❌ Greška: Lozinka nije uneta!\n');
    console.log('Upotreba: npm run generate-hash <lozinka>\n');
    console.log('Primer:   npm run generate-hash mypassword123\n');
    process.exit(1);
  }

  console.log('\n🔐 Generisanje bcrypt hash-a...\n');
  
  const hash = await bcrypt.hash(password, 10);
  
  console.log('✅ Hash generisan uspešno!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Lozinka: ${password}`);
  console.log(`Hash:    ${hash}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 Kopiraj gornji hash i ubaci ga u Supabase kolonu "password_hash"\n');
  console.log('💡 TIP: Možeš i direktno ubaciti običan tekst (npr. "password123")');
  console.log('    Aplikacija će automatski hash-ovati pri prvom loginu!\n');
}

generateHash().catch(console.error);
