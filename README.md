# Webinar Tracker 📊

Dashboard de suivi campagne publicitaire — Next.js 14 + Supabase Realtime.

---

## 1. Créer les tables dans Supabase

Va dans ton projet Supabase → **SQL Editor** → colle et exécute ce SQL :

```sql
-- Table des cohortes (une par semaine)
create table cohorts (
  id uuid default gen_random_uuid() primary key,
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- Table des mises à jour
create table updates (
  id uuid default gen_random_uuid() primary key,
  cohort_id uuid references cohorts(id) on delete cascade,
  spend numeric not null,
  inscrits integer not null,
  note text default '',
  updated_at timestamp with time zone default now()
);

-- Activer le Realtime sur les deux tables
alter publication supabase_realtime add table cohorts;
alter publication supabase_realtime add table updates;

-- Politique RLS : lecture publique, écriture publique (accès par lien)
alter table cohorts enable row level security;
alter table updates enable row level security;

create policy "lecture publique" on cohorts for select using (true);
create policy "ecriture publique" on cohorts for insert with check (true);
create policy "update publique" on cohorts for update using (true);

create policy "lecture publique" on updates for select using (true);
create policy "ecriture publique" on updates for insert with check (true);
```

---

## 2. Déployer sur Vercel

### Push GitHub
```bash
git init
git add .
git commit -m "init webinar tracker"
git remote add origin https://github.com/TON_USERNAME/webinar-tracker.git
git push -u origin main
```

### Vercel
1. Va sur [vercel.com](https://vercel.com) → **Add New Project**
2. Importe le repo GitHub
3. Dans **Environment Variables**, ajoute :
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://cuepnqnwhzmpczdhclqd.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = ta clé anon
4. Clique **Deploy**

> ⚠️ Ne commit JAMAIS le fichier `.env.local` sur GitHub.
> Le `.gitignore` l'exclut déjà. Sur Vercel, mets les variables manuellement.

---

## 3. Utilisation

- **Mettre à jour** : saisis spend + inscrits → Enregistrer. Tout le monde voit en temps réel.
- **Switch** : chaque dimanche à 17h → clique 🔄 SWITCH → confirme.
- **Résumé** : clique "Copier" pour envoyer le résumé au client.

---

## Dev local
```bash
npm install
npm run dev
```
