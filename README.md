# Planeja Concurso

Central Tática de Estudos para Concurseiros.

Disciplina. Foco. Aprovação.

Plataforma de estudos com design militar: gerencie rotinas, ciclos e simulados com a disciplina de um verdadeiro soldado concurseiro.

## Funcionalidades

### Aluno
- **Dashboard** — Visão geral com ciclo de estudos, pendências e média de horas
- **Minhas Rotinas** — Criação de rotinas semanais com grade horária
- **Meus Concursos** — Cadastro de concursos com disciplinas e pesos
- **Meus Ciclos** — Geração de ciclos de estudo baseados nos concursos
- **Meus Simulados** — Registro de simulados com resultados por matéria
- **Bisus & Dicas** — Blog com artigos formatados e dicas de estudo
- **Feedback** — Reporte de bugs e sugestões de melhoria
- **Tema Claro/Escuro** — Alternância com 1 clique

### Admin
- **Dashboard** — Estatísticas de usuários e publicações
- **Usuários** — Gerenciamento com ativação/desativação de acesso
- **Publicar Bisus** — Editor rico de artigos com toolbar
- **Mensagens & Avisos** — Comunicação direta com alunos
- **Concursos Oficiais** — Templates que alunos importam com 1 clique
- **Feedback** — Gestão de bugs e sugestões dos alunos

## Tecnologias

- HTML5, CSS3, JavaScript (Vanilla)
- Bootstrap 5.3 + Bootstrap Icons
- Firebase Auth (Google + Email/Senha)
- Firestore (banco de dados com persistência offline híbrida)
- PWA (instalável, offline, auto-update)

## Estrutura

```
planeja-concurso/
├── index.html            # SPA principal
├── styles.css            # Temas claro/escuro
├── firebase-config.js    # Firebase Auth + DB híbrido
├── app-core.js           # Navegação, rotinas, dashboard
├── app-ciclos.js         # Concursos e ciclos de estudo
├── app-simulados.js      # Simulados e resultados
├── app-bisus.js          # Blog com editor rico
├── app-admin.js          # Painel administrativo
├── sw.js                 # Service Worker (PWA)
├── manifest.json         # Manifest PWA
├── icon-192.png          # Ícone PWA
├── icon-512.png          # Ícone PWA
├── .gitignore
└── README.md
```

## Autenticação

| Método | Interface | Provedor |
|--------|-----------|----------|
| Google Sign-In | Aluno | `google.com` |
| Email/Senha | Admin (`#admin`) | `password` |

## Instalação (PWA)

Acesse pelo Chrome/Edge e clique em "Instalar" na barra de endereço.

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
