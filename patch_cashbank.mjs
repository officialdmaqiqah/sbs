import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/pages/CashBankList.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// The original block
const targetInsert = `        const { error } = await supabase.from('cash_bank_accounts').insert({
          organization_id: profile.organization_id,
          account_id: formData.gl_account_id,
          name: formData.account_name,
          code: formData.account_code,
          type: formData.account_type,
          active: true
        });`;

const replacementInsert = `        const { error } = await supabase.from('cash_bank_accounts').insert({
          organization_id: profile.organization_id,
          account_id: formData.gl_account_id,
          name: formData.account_name,
          code: formData.account_code,
          type: formData.account_type,
          bank_name: formData.account_type === 'Bank' ? formData.bank_name : null,
          bank_account_number: formData.account_type === 'Bank' ? formData.bank_account_number : null,
          account_holder: formData.account_type === 'Bank' ? formData.account_holder : null,
          notes: formData.notes,
          active: true
        });`;

const targetUpdate = `        const { error } = await supabase.from('cash_bank_accounts').update({
          name: formData.account_name,
          code: formData.account_code,
          type: formData.account_type,
          account_id: formData.gl_account_id
        }).eq('id', selectedAccount.id);`;

const replacementUpdate = `        const { error } = await supabase.from('cash_bank_accounts').update({
          name: formData.account_name,
          code: formData.account_code,
          type: formData.account_type,
          account_id: formData.gl_account_id,
          bank_name: formData.account_type === 'Bank' ? formData.bank_name : null,
          bank_account_number: formData.account_type === 'Bank' ? formData.bank_account_number : null,
          account_holder: formData.account_type === 'Bank' ? formData.account_holder : null,
          notes: formData.notes
        }).eq('id', selectedAccount.id);`;

content = content.replace(targetInsert, replacementInsert);
content = content.replace(targetUpdate, replacementUpdate);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully patched CashBankList.tsx');
