# O Mentor

Plataforma de estudos e gerenciamento de rotinas para concurseiros.

## Funcionalidades

### Aluno
- **Dashboard** — Visão geral com ciclo de estudos, pendências e média de horas
- **Minhas Rotinas** — Criação de rotinas semanais com grade horária
- **Meus Concursos** — Cadastro de concursos com disciplinas e pesos
- **Meus Ciclos** — Geração de ciclos de estudo baseados nos concursos
- **Meus Simulados** — Registro de simulados com resultados por matéria
- **Bisus & Dicas** — Blog com dicas e ferramentas para estudo
- **Configurações** — Perfil e reset de dados

### Admin
- **Dashboard** — Estatísticas de usuários e publicações
- **Usuários** — Gerenciamento com ativação/desativação de acesso
- **Publicar Bisus** — Criação de conteúdo para os alunos

## Tecnologias

- HTML5, CSS3, JavaScript (Vanilla)
- Bootstrap 5.3 + Bootstrap Icons
- Firebase Auth (Google + Email/Senha)
- Firestore (banco de dados com persistência offline híbrida)

## Estrutura

```
O mentor/
├── index.html            # SPA principal
├── styles.css            # Estilos completos
├── firebase-config.js    # Config Firebase, Auth, DB híbrido
├── app-core.js           # Navegação, rotinas, toast
├── app-ciclos.js         # Concursos e ciclos de estudo
├── app-simulados.js      # Simulados e resultados
├── app-bisus.js          # Blog Bisus & Dicas
├── app-admin.js          # Painel administrativo
├── .gitignore
└── README.md
```

## Autenticação

| Método | Interface | Provedor |
|--------|-----------|----------|
| Google Sign-In | Aluno | `google.com` |
| Email/Senha | Admin (`#admin`) | `password` |

- **Aluno**: Acessa `index.html` e faz login com Google
- **Admin**: Acessa `index.html#admin` e faz login com email/senha

## Executar Localmente

```bash
cd "O mentor"
python3 -m http.server 5500
```

Acessar: `http://localhost:5500`

## Configuração Firebase

1. Criar projeto no [Firebase Console](https://console.firebase.google.com)
2. Ativar Authentication (Google + Email/Senha)
3. Criar Firestore Database
4. Atualizar `firebaseConfig` em `firebase-config.js`

### Regras do Firestore

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
