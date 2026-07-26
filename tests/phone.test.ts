import test from 'node:test';import assert from 'node:assert/strict';import {normalizeBrazilPhone,whatsappUrl} from '../src/lib/phone.ts';
test('normaliza telefone brasileiro',()=>assert.equal(normalizeBrazilPhone('(16) 99999-9999'),'5516999999999'));test('gera wa.me',()=>assert.equal(whatsappUrl('(16) 99999-9999','Olá'),'https://wa.me/5516999999999?text=Ol%C3%A1'));
