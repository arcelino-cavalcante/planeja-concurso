# 🎖️ Planeja Concurso

> Plataforma PWA completa de estudos, gestão de rotinas e gamificação militar para concurseiros.

---

## 📋 Funcionalidades

### 👨‍🎓 Aluno
| Módulo | Descrição |
|---|---|
| **Dashboard** | Visão geral com ciclo de estudos, pendências e média de horas |
| **Minhas Rotinas** | Grade horária semanal com modo Foco e cronômetro |
| **Meus Concursos** | Cadastro de concursos com disciplinas e pesos |
| **Meus Ciclos** | Geração automática de ciclos baseados nos concursos |
| **Meus Simulados** | Registro de simulados com resultados por matéria |
| **Bisus & Dicas** | Blog com artigos e dicas de estudo |
| **QG do Combatente** | Sistema de patentes militares e ranking gamificado |

### 🔐 Admin
| Módulo | Descrição |
|---|---|
| **Dashboard** | Estatísticas de usuários e publicações |
| **Usuários** | Gerenciamento com ativação/desativação de acesso |
| **Publicar Bisus** | Editor rico de artigos com toolbar |
| **Mensagens & Avisos** | Comunicação direta com alunos |
| **Concursos Oficiais** | Templates que alunos importam com 1 clique |
| **Feedback** | Gestão de bugs e sugestões dos alunos |

---

## 🛠️ Tecnologias

- **Frontend:** HTML5, CSS3, JavaScript Vanilla
- **UI:** Bootstrap 5.3 + Bootstrap Icons
- **Auth:** Firebase Authentication (Google + Email/Senha)
- **Banco:** Firestore (offline híbrido: localStorage + cloud debounced)
- **Storage:** Firebase Storage (avatars de perfil)
- **PWA:** Service Worker com auto-update para todos os usuários

---

## 📁 Estrutura

```
planeja-concurso/
├── index.html            # SPA principal (todas as páginas)
├── styles.css            # Design system + temas claro/escuro
├── firebase-config.js    # Firebase, DB híbrido, sync, Storage
├── app-core.js           # Navegação, rotinas, dashboard, perfil
├── app-ciclos.js         # Concursos e ciclos de estudo
├── app-simulados.js      # Simulados e resultados
├── app-bisus.js          # Blog com editor rico
├── app-edital.js         # Gestão de edital e matérias
├── app-qg.js             # QG: patentes, leaderboard, avatar
├── app-admin.js          # Painel administrativo
├── sw.js                 # Service Worker (PWA + auto-update)
├── manifest.json         # Manifest PWA
├── deploy.sh             # ⚡ Script de deploy automático
├── icon-192.png          # Ícone PWA
├── icon-512.png          # Ícone PWA
├── firestore.rules       # Regras de segurança Firestore
└── README.md
```

---

## 🔐 Autenticação

| Método | Tipo de usuário | Provider Firebase |
|---|---|---|
| Google Sign-In | Aluno | `google.com` |
| Email/Senha | Admin | `password` + email na lista branca |

O admin é definido em `firebase-config.js`:
```js
const ADMIN_EMAILS = ['admin@gmail.com'];
```

---

## ⚙️ Configuração Firebase

1. Criar projeto no [Firebase Console](https://console.firebase.google.com)
2. Ativar **Authentication** → Google + Email/Senha
3. Criar **Firestore Database** (modo produção)
4. Ativar **Storage** (para avatars de perfil)
5. Atualizar `firebaseConfig` em `firebase-config.js`

### Regras do Firestore
Usar as regras em [`firestore.rules`](./firestore.rules). Para publicar:
```bash
firebase deploy --only firestore:rules
```

---

## 📲 Instalação como PWA

1. Abrir o app no **Chrome** ou **Edge**
2. Clicar em **"Instalar"** na barra de endereço (ícone de download)
3. O app será adicionado à tela inicial / área de trabalho
4. Funciona **offline** com dados sincronizados quando voltar a conexão

---

## 🚀 Deploy e Versionamento Automático

> **Regra de ouro:** sempre que publicar alterações, execute o script de deploy.  
> Ele atualiza automaticamente a versão nos dois lugares necessários (`sw.js` e `index.html`) e faz o commit + push no git.

### Por que precisa versionar?

O sistema de atualização automática da PWA funciona assim:

```
Você altera arquivos → faz deploy
        ↓
Service Worker detecta nova versão (sw.js?v=X.Y.Z)
        ↓
Browser instala o novo SW em background
        ↓
Banner "🆕 Nova versão disponível!" aparece para o usuário
        ↓
Usuário clica "Atualizar agora" → app recarrega atualizado ✅
```

Se você **não versionar**, o browser não saberá que o SW mudou e os usuários continuarão com a versão antiga, mesmo depois de fazer o deploy.

---

### ⚡ Usando o script `deploy.sh`

O script é a forma mais simples e segura de fazer o deploy:

```bash
# Incremento de patch (mais comum): 1.2.0 → 1.2.1
./deploy.sh

# Incremento de minor (nova funcionalidade): 1.2.0 → 1.3.0
./deploy.sh minor

# Incremento de major (mudança grande): 1.2.0 → 2.0.0
./deploy.sh major

# Versão exata
./deploy.sh 2.5.0
```

O script faz automaticamente:
1. ✅ Lê a versão atual de `sw.js`
2. ✅ Calcula a próxima versão
3. ✅ Atualiza `SW_VERSION` em `sw.js`
4. ✅ Atualiza `APP_VERSION` em `index.html`
5. ✅ Faz `git add` + `git commit` com mensagem padronizada
6. ✅ Faz `git push` para o branch atual
7. ✅ Reverte automaticamente se qualquer etapa falhar

---

### 🔧 Deploy manual (quando não usar o script)

Se precisar atualizar manualmente, altere **os dois arquivos abaixo** com a **mesma versão**:

**`sw.js` — linha 3:**
```js
const SW_VERSION = '1.3.0'; // ← altere aqui
```

**`index.html` — dentro do bloco `<script>` do SW:**
```js
const APP_VERSION = '1.3.0'; // ← mesma versão aqui
```

> ⚠️ **Atenção:** As duas versões devem ser idênticas. Se ficarem diferentes, o sistema de update não funciona corretamente.

---

### 📡 Deploy no Firebase Hosting

Após rodar `./deploy.sh`, publique os arquivos:

```bash
firebase deploy --only hosting
```

Ou tudo de uma vez (hosting + regras):
```bash
firebase deploy
```

---

### 🔁 Estratégia de verificação de atualização

O app verifica se há nova versão nos seguintes momentos:

| Evento | Comportamento |
|---|---|
| App abre | Verifica imediatamente |
| A cada **2 minutos** | Polling automático em background |
| Tab volta ao foco | Verifica ao retornar ao app |
| Janela recebe foco | Verifica ao alternar para o app (PWA standalone) |
| Botão "Verificar atualizações" | Verificação manual em Configurações |

---

## 🗂️ Sistema de Dados Híbrido

Os dados do aluno são salvos em **dois locais simultaneamente**:

| Local | Velocidade | Quando usada |
|---|---|---|
| `localStorage` | Instantâneo | Leitura/escrita imediata |
| **Firestore** | 2.5s debounced | Sincronização na nuvem |

A sincronização da nuvem usa **debounce de 2.5 segundos** — múltiplas alterações rápidas são agrupadas em uma única escrita, reduzindo o consumo de cota do Firestore.

---

## 🛡️ Segurança

- Admin só pode entrar com Email/Senha + email na lista branca `ADMIN_EMAILS`
- Alunos só podem ler/escrever nos próprios dados (`/users/{uid}`)
- Firestore Rules validam tamanho máximo de payload (50 campos)
- Firebase Storage protegido por autenticação para uploads de avatar

---

## 📞 Suporte

Para reportar bugs ou sugerir melhorias, use a seção **Feedback** dentro da plataforma.
