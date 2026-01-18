# 🚀 Inicio Rápido - DAO Voting Platform

## Opción 1: Script Automático (RECOMENDADO)

### Paso 1: Inicia Anvil
Abre una terminal y ejecuta:

```bash
anvil
```

Deja esta terminal abierta. Deberías ver 10 cuentas con sus llaves privadas.

### Paso 2: Ejecuta el Script de Inicio
En una **nueva terminal**, desde la raíz del proyecto:

```bash
./start.sh
```

Este script:
- ✅ Despliega los contratos automáticamente
- ✅ Configura las variables de entorno
- ✅ Inicia el servidor de desarrollo

### Paso 3: Configura MetaMask

1. Abre MetaMask
2. Agrega la red Anvil:
   - **Network Name:** Anvil Local
   - **RPC URL:** http://127.0.0.1:8545
   - **Chain ID:** 31337
   - **Currency Symbol:** ETH

3. Importa una cuenta de Anvil:
   - Click en tu icono → "Import Account"
   - Pega esta clave privada: 
   ```
   0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
   ```

### Paso 4: ¡Usa la Aplicación!

Abre http://localhost:3000 y:
1. Click en "Connect Wallet"
2. Deposita ETH al DAO (ej: 10 ETH)
3. Crea una propuesta
4. ¡Vota sin pagar gas! 🎉

---

## Opción 2: Manual

### 1. Inicia Anvil
```bash
anvil
```

### 2. Despliega Contratos
En otra terminal:

```bash
cd sc
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast
```

**Copia las direcciones** de los contratos desplegados.

### 3. Configura Variables de Entorno

```bash
cd ../web
nano .env.local
```

Edita el archivo con las direcciones que copiaste:

```env
NEXT_PUBLIC_DAO_ADDRESS=TU_DIRECCION_DAO
NEXT_PUBLIC_FORWARDER_ADDRESS=TU_DIRECCION_FORWARDER
NEXT_PUBLIC_CHAIN_ID=31337
RELAYER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
RPC_URL=http://127.0.0.1:8545
```

### 4. Inicia el Frontend

```bash
npm run dev
```

### 5. Configura MetaMask (igual que arriba)

---

## 🐛 Solución de Problemas

### "Page not found" o página en blanco
```bash
cd web
rm -rf .next
npm run dev
```

### "Cannot connect to Anvil"
Verifica que Anvil esté corriendo en http://127.0.0.1:8545

### "Contract not deployed"
Re-ejecuta el script de deployment o usa el script automático `./start.sh`

### MetaMask no se conecta
1. Asegúrate de estar en la red "Anvil Local"
2. Verifica que la URL sea http://127.0.0.1:8545 (no https)
3. Chain ID debe ser 31337

---

## 📝 Cuentas de Anvil

Para probar con múltiples usuarios:

**Cuenta #0 (Deployer):**
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Cuenta #1 (Relayer):**
```
0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

**Cuenta #2 (Usuario):**
```
0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

**Cuenta #3 (Usuario):**
```
0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
```

---

## 🎯 Prueba Rápida

1. **Conecta la Cuenta #2**
2. **Deposita 10 ETH** al DAO
3. **Crea una propuesta:**
   - Recipient: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
   - Amount: `1.0` ETH
   - Duration: `2` minutos
   - Description: "Test proposal"

4. **Vota A FAVOR** (¡sin gas!)
5. Espera 3 minutos (2 min votación + 1 min delay)
6. La propuesta se ejecutará automáticamente

---

## 🎊 ¡Listo!

Tu aplicación DAO está corriendo. Los usuarios pueden votar sin pagar gas gracias a las meta-transacciones.

**¿Necesitas ayuda?** Revisa el README.md completo.
