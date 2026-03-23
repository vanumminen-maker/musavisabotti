# Musavisabotti – Käyttöohjeet

Discord-botti musiikkitietovisaan. Botti liittyy äänikanavalle ja soittaa **SoundCloud**-musiikkia. Pelaajat arvaavat artistin ja/tai kappaleen nimen tekstikanavalla.

## 1. Discord Developer Portal

1. Mene osoitteeseen [discord.com/developers/applications](https://discord.com/developers/applications)
2. Klikkaa **New Application** → anna nimi (esim. "Musavisabotti") → Create
3. Vasemmasta valikosta: **Bot** → **Add Bot**
4. **Token**: Klikkaa **Reset Token** → kopioi token → tallenna `.env`-tiedostoon
5. **Privileged Gateway Intents** – laita päälle:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
6. **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Connect`, `Speak`, `Send Messages`, `Read Message History`
   - Kopioi URL → liitä selaimeen → kutsu botti serverille

## 2. SoundCloud-käyttö

SoundCloud ei vaadi erillisiä avaimia tai kirjautumista botilta. Se on tällä hetkellä helpoin ja vakain tapa käyttää visabottia! Voit etsiä soittolistoja (sets) tai yksittäisiä biisejä SoundCloudista ja lisätä ne suoraan peliin.

---

## Paikallinen kehitys

```bash
# 1. Asenna riippuvuudet
npm install

# 2. Luo .env tiedosto
cp .env.example .env

# 3. Rekisteröi slash-komennot
npm run deploy

# 4. Käynnistä
npm run start
```

---

## Railway-deployment

1. Pushaa koodi GitHubiin.
2. Railway buildaa automaattisesti.
3. Asetukset → **Variables** – lisää:
   - `DISCORD_TOKEN` = botin token
   - `CLIENT_ID` = Application ID

---

## Komennot

| Komento | Kuvaus | Oikeus |
|---|---|---|
| `/lisää url` | Lisää biisi tai soittolista SoundCloudista | Manage Messages |
| `/lista` | Näytä biisilista | Manage Messages |
| `/poista numero` | Poista biisi listalta | Manage Messages |
| `/musavisa` | Aloita peli (liittyy vc:lle) | Manage Messages |
| `/stop` | Keskeytä biisi, paljasta vastaus | Manage Messages |
| `/next` | Seuraava biisi | Manage Messages |
| `/lopeta` | Lopeta peli + leaderboard | Manage Messages |
| `/leaderboard` | Pisteet kesken pelin | Kaikki |
| `/ohje` | Näytä ohjeet Discordissa | Kaikki |

---

## Esimerkki biisien lisäämisestä:
1. Mene [SoundCloudiin](https://soundcloud.com) ja etsi biisi tai soittolista.
2. Kopioi linkki (esim. `https://soundcloud.com/user/track-name`).
3. Käytä botin komentoa: `/lisää url: https://soundcloud.com/...`
