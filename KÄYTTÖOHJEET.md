# Musavisabotti – Käyttöohjeet

Discord-botti musiikkitietovisaan. Botti liittyy äänikanavalle ja soittaa YouTube-musiikkia. Pelaajat arvaavat artistin ja/tai kappaleen nimen tekstikanavalla.

## Ennen käyttöä: Discord Developer Portal

1. Mene osoitteeseen [discord.com/developers/applications](https://discord.com/developers/applications)
2. Klikkaa **New Application** → anna nimi (esim. "Musavisabotti") → Create
3. Vasemmasta valikosta: **Bot** → **Add Bot**
4. **Token**: Klikkaa **Reset Token** → kopioi token → tallenna `.env`-tiedostoon
5. **Privileged Gateway Intents** – laita päälle:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
6. **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Connect`, `Speak`, `Send Messages`, `Read Message History`, `Manage Messages`
   - Kopioi URL → liitä selaimeen → kutsu botti serverille

---

## Paikallinen kehitys

```bash
# 1. Asenna riippuvuudet
npm install

# 2. Luo .env tiedosto
cp .env.example .env
# Täytä DISCORD_TOKEN ja CLIENT_ID (Application ID Developer Portalista)

# 3. Rekisteröi slash-komennot Discordiin (kerran tai komentojen muuttuessa)
npm run deploy

# 4. Käynnistä botti
npm run start
```

---

## Railway-deployment

1. Pushaa koodi GitHubiin
2. Luo uusi projekti Railwayssa → **Deploy from GitHub repo**
3. Asetukset → **Variables** – lisää:
   - `DISCORD_TOKEN` = botin token
   - `CLIENT_ID` = Application ID (Developer Portalista)
4. Railway buildaa automaattisesti Dockerfilen avulla

> **Huom:** Slash-komennot pitää rekisteröidä erikseen. Voit tehdä sen paikallisesti ennen deploymenttia tai lisätä `npm run deploy` Railway:n build-komentoon.

---

## Komennot

| Komento | Kuvaus | Oikeus |
|---|---|---|
| `/lisää artisti kappale url` | Lisää biisi listalle | Manage Messages |
| `/lista` | Näytä biisilista | Manage Messages |
| `/poista numero` | Poista biisi listalta | Manage Messages |
| `/musavisa` | Aloita peli (liittyy vc:lle) | Manage Messages |
| `/stop` | Keskeytä biisi, paljasta vastaus | Manage Messages |
| `/next` | Seuraava biisi | Manage Messages |
| `/lopeta` | Lopeta peli + leaderboard | Manage Messages |
| `/leaderboard` | Pisteet kesken pelin | Kaikki |

---

## Pisteytysjärjestelmä

- Artisti **tai** kappale oikein → **1 piste**
- Artisti **ja** kappale oikein → **2 pistettä**
- Ensimmäinen oikein ⚡ → **+1 bonuspiste**
- Arvaukset tarkistetaan fuzzy-matchingilla (pienet kirjoitusvirheet sallittu)

---

## Pelauksen kulku

1. **Rakenna biisilista ennen peliä:**
   ```
   /lisää Darude Sandstorm https://www.youtube.com/watch?v=...
   /lisää Nightwish Ghost Love Score https://youtu.be/...
   ```
2. **Aloita peli** (liity ensin äänikanavalle!):
   ```
   /musavisa
   ```
3. **Pelaajat arvaavat** kirjoittamalla tekstikanavalle (ei slash-komentoja, ihan normaali viesti):
   ```
   Darude
   Sandstorm
   darude sandstorm
   ```
4. **Seuraava biisi:**
   ```
   /next
   ```
5. **Lopeta ja julkaise tulokset:**
   ```
   /lopeta
   ```

---

## Vianmääritys

**Botti ei soita ääntä:**
- Varmista että olet äänikanavalla ennen `/musavisa`-komennon käyttöä
- Tarkista Railway-lokit: `ffmpeg` pitää olla asennettuna (Dockerfile hoitaa tämän automaattisesti)

**"Virhe biisin lataamisessa":**
- Tarkista että YouTube-linkki on voimassa ja video on julkinen
- Jotkut videot voivat olla alueellisesti rajoitettuja

**Slash-komennot eivät näy:**
- Aja `npm run deploy` kerran paikallisesti tai lisää se build-komentoon
- Discord päivittää globaalit komennot joskus hitaasti (max 1h)
