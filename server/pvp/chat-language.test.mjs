import test from 'node:test';import assert from 'node:assert/strict';
import {censorChat} from './chat-language.mjs';
test('censor covers regional slang, accents and common obfuscation without substring false positives',()=>{
 for(const word of ['puta','PÚTA','p.u.t.a','p_u_t_a','p0rr4','ctm','culiao','weón','FUCK','sh1t','merde','caralho','cazzo'])assert.equal(censorChat(word),'***',word);
 for(const text of ['computadora','disputa','huevos','clase','Vamos al Coloso','Hola equipo'])assert.equal(censorChat(text),text);
 assert.equal(censorChat('Hola, mierda!'),'Hola, ***!');
});
