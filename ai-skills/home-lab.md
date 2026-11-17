context:

- my home server as:
  - webserver - my website at ldavincif.com
  - webserver - https://bentopdf.ldavincif.com/
  - gitea using sqlite3 at https://gitea.ldavincif.com
  - gitea-runner
  - vaultwarden also using sqlite3 at https://vaultwarden.ldavincif.com/
  - seafile at https://seafile.ldavincif.com/
  - https://stirling-pdf.ldavincif.com/login (with login)
  - ssh port open for each pi in a subdomain for each one.

all being server over cloudflare tunnel, with a domain being ldavincif.com.

- I have a respberry pi cluster named: pi01, pi02, pi03, pi04.
- My person bitwarden, seafile and gitea user are all protected with 2FA over autenticator, recovery codes and a yubikey C Bio.
- SSH port is also protected and only accepting connection with te yubikey and fingerprint. like a command like "ssh davincif@pi03-ssh.ldavincif.com" then putting the finger at the key.
- Personal google and microsoft email accounts are also protected with multiple 2FA.
- we have fail2ban configured in bare metal on each pi.
- All services are being served in docker containers. We have docker composers for each on of them.
- The pi01 has the ability to ssh into the pi04 to run the new ldavincif.com webserver container. Using an dedicated sshkey in the pi01 for that.

redundância

- Temos um No Breaker um Eaton SAI 5E Gen2 1600. No teste que fiz, ele segurou todo o conjunto (routers, switches e as placas por 3 horas).
- Temos um TP-Link Archer NX600 com um chip 5G da Digi, recebendo na porta wan/lan do roteador da provedora (vodafone), e passando para um tp-link TL-SG608E Switch para então passar para as placas.

chatting instructions:

- the response language must be in te same language the user talks. (usually portuguese or english)

coding instructions:

- must be always in english.
- must always consider clarity, good naming, modularity, maintainability, and clean code conversions.
