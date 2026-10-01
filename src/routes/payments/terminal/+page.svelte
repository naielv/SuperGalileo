<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getActiveDb } from '$lib/db';
	import { formatMoney, performTransaction, PAYMENT_METHODS } from '$lib/pagos';
	import PersonSelector from '$lib/comp/PersonSelector.svelte';
	import { toast } from 'svelte5-toaster';

	let db = $state(null);

	let step = $state(1);
	let tipo = $state('');
	let metodo = $state('');
	let monto = $state('');
	let notas = $state('');
	let source = $state(null); // { key:'personas:X', label }
	let dest = $state(null);
	let saldoSource = $state(null); // null = aún sin cargar
	let processing = $state(false);

	const metodoDisabled = $derived(tipo === 'Ingreso');
	const sourceId = $derived(source?.key?.replace(/^personas:/, '') || '');
	const destId = $derived(dest?.key?.replace(/^personas:/, '') || '');

	async function readSaldo(key) {
		if (!db || !key) {
			saldoSource = null;
			return;
		}
		try {
			const pid = String(key || '').replace(/^personas:/, '');
			const doc = await db.get(`personas:${pid}`);
			saldoSource = parseFloat(doc.data?.Monedero_Balance || 0);
		} catch {
			saldoSource = null;
		}
	}

	$effect(() => {
		if (source?.key) readSaldo(source.key);
	});

	function onTipoChange() {
		if (tipo === 'Ingreso') metodo = 'Efectivo';
	}

	function stepNext() {
		if (step === 1) {
			if (!tipo) return toast.error('Selecciona el tipo de transacción.');
			if (!metodo) return toast.error('Selecciona el método de pago.');
			const m = parseFloat(monto);
			if (Number.isNaN(m) || m <= 0) return toast.error('Introduce un monto válido.');
			if (tipo === 'Ingreso' && metodo !== 'Efectivo') metodo = 'Efectivo';
			step = 2;
		} else if (step === 2) {
			if (!sourceId) return toast.error('Selecciona un monedero.');
			if (tipo === 'Transferencia') {
				if (!destId) return toast.error('Selecciona el monedero destino.');
				if (destId === sourceId) return toast.error('No puedes transferir al mismo monedero.');
			}
			// Bloqueo por saldo (gasto/transferencia con tarjeta), igual que en TeleSec
			const m = parseFloat(monto);
			if ((tipo === 'Gasto' || tipo === 'Transferencia') && metodo === 'Tarjeta') {
				if (saldoSource != null && saldoSource < m) {
					return toast.error(`Saldo insuficiente. Disponible: ${formatMoney(saldoSource)}`);
				}
			}
			step = 3;
		}
	}

	function stepBack() {
		if (step > 1) step--;
	}

	function resetForm() {
		step = 1;
		tipo = '';
		metodo = '';
		monto = '';
		notas = '';
		source = null;
		dest = null;
		saldoSource = null;
	}

	async function confirmar() {
		if (processing) return;
		processing = true;
		const res = await performTransaction(db, {
			tipo,
			metodo,
			monto,
			persona: source?.key,
			personaDestino: tipo === 'Transferencia' ? dest?.key : '',
			notas
		});
		processing = false;
		if (!res.ok) {
			if (res.error?.startsWith('Saldo insuficiente')) step = 2;
			toast.error(res.error);
			return;
		}
		toast.success('¡Transacción completada!');
		goto('/payments');
	}

	onMount(() => {
		try {
			db = getActiveDb();
		} catch (error) {
			toast.error(error.message);
		}
	});
</script>

{#if db}
	<div class="shell">
		<h1 class="title">Terminal de pago SuperGalileo</h1>

		<div class="card">
			<h2 class="step-title">Paso {step} de 3</h2>

			{#if step === 1}
				<fieldset>
					<legend>1. Información de la transacción</legend>

					<label>
						<b>Tipo de transacción</b>
						<select bind:value={tipo} onchange={onTipoChange}>
							<option value="">-- operación --</option>
							<option value="Ingreso">➕ Ingreso (Depósito)</option>
							<option value="Gasto">➖ Gasto (Retiro/Pago)</option>
							<option value="Transferencia">🔄 Transferencia</option>
						</select>
					</label>

					<label>
						<b>Método de pago</b>
						<select bind:value={metodo} disabled={metodoDisabled}>
							<option value="">-- método --</option>
							{#each PAYMENT_METHODS as mth}
								<option value={mth} disabled={tipo === 'Ingreso' && mth !== 'Efectivo'}>
									{mth}
								</option>
							{/each}
						</select>
						{#if tipo === 'Ingreso'}
							<small class="hint">Los ingresos solo se admiten en efectivo.</small>
						{/if}
					</label>

					<label>
						<b>Monto (€)</b>
						<input
							type="number"
							step="0.01"
							min="0"
							bind:value={monto}
							placeholder="0.00"
							inputmode="decimal"
						/>
					</label>

					<label>
						<b>Notas</b>
						<textarea rows="3" bind:value={notas} placeholder="Notas adicionales..."></textarea>
					</label>
				</fieldset>
			{:else if step === 2}
				<fieldset>
					<legend>2. Seleccionar monedero</legend>

					<div class="amount-big">{formatMoney(monto || 0)}</div>

					<label>
						<b>Monedero</b>
						<PersonSelector label="Origen" bind:selected={source} />
						{#if saldoSource != null}
							<small class="hint">Saldo disponible: {formatMoney(saldoSource)}</small>
						{/if}
					</label>

					{#if tipo === 'Transferencia'}
						<label>
							<b>Monedero destino</b>
							<PersonSelector label="Destino" bind:selected={dest} />
						</label>
					{/if}
				</fieldset>
			{:else}
				<fieldset>
					<legend>3. Confirmación del cliente</legend>

					<div class="amount-big">{formatMoney(monto || 0)}</div>
					<dl class="summary">
						<div><dt>Tipo</dt><dd>{tipo}</dd></div>
						<div><dt>Método</dt><dd>{metodo}</dd></div>
						<div><dt>Monedero</dt><dd>{source?.label || '—'}</dd></div>
						{#if tipo === 'Transferencia'}
							<div><dt>Destino</dt><dd>{dest?.label || '—'}</dd></div>
						{/if}
						<div><dt>Notas</dt><dd>{notas || '(sin notas)'}</dd></div>
					</dl>

					<p class="warn">⚠️ Cliente: verifica los datos antes de confirmar.</p>
				</fieldset>
			{/if}
		</div>

		<div class="buttons">
			{#if step === 1}
				<button type="button" class="danger" onclick={resetForm}>✖️ CANCELAR</button>
				<button type="button" class="ok" onclick={stepNext}>→ SIGUIENTE</button>
			{:else}
				<button type="button" class="back" onclick={stepBack}>← ATRÁS</button>
				{#if step === 2}
					<button type="button" class="ok" onclick={stepNext}>→ SIGUIENTE</button>
				{:else}
					<button type="button" class="ok" onclick={confirmar} disabled={processing}>
						{processing ? 'Procesando…' : '✔️ CONFIRMAR'}
					</button>
				{/if}
			{/if}
		</div>
	</div>
{:else}
	<p class="empty">
		Configura una base de datos activa en
		<a href="/settings/database">Ajustes de Base de Datos</a>.
	</p>
{/if}

<style>
	.shell {
		max-width: 600px;
		margin: 0 auto;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 20px;
		border-radius: 15px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
	}
	.title {
		color: #fff;
		text-align: center;
		margin: 0 0 20px;
	}
	.card {
		background: #fff;
		padding: 20px;
		border-radius: 10px;
		margin-bottom: 20px;
	}
	.step-title {
		text-align: center;
		color: #333;
		margin: 0 0 14px;
	}
	fieldset {
		border: 2px solid #667eea;
		border-radius: 8px;
	}
	legend {
		color: #667eea;
		font-weight: 700;
	}
	label {
		display: block;
		margin-bottom: 14px;
	}
	label b {
		display: block;
		margin-bottom: 5px;
	}
	select,
	input,
	textarea {
		width: 100%;
		padding: 10px;
		font-size: 16px;
		border: 2px solid #ddd;
		border-radius: 5px;
		box-sizing: border-box;
	}
	input[type='number'] {
		font-size: 24px;
		text-align: right;
		font-weight: 700;
	}
	.hint {
		color: #555;
		font-size: 12px;
	}
	.amount-big {
		text-align: center;
		font-size: 44px;
		font-weight: 700;
		color: #667eea;
		margin: 8px 0 16px;
	}
	.summary {
		margin: 0 0 14px;
	}
	.summary > div {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 6px 0;
		border-bottom: 1px solid #eee;
	}
	.summary dt {
		color: #555;
		font-weight: 700;
	}
	.summary dd {
		margin: 0;
		text-align: right;
		overflow-wrap: anywhere;
	}
	.warn {
		text-align: center;
		padding: 14px;
		background: #fff3cd;
		border-radius: 8px;
		border: 2px solid #ffc107;
		color: #856404;
		font-weight: 700;
	}
	.buttons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.buttons button {
		padding: 16px;
		font-size: 17px;
		font-weight: 700;
		color: #fff;
		border: none;
		border-radius: 8px;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.danger {
		background: #ff4757;
	}
	.ok {
		background: #2ed573;
	}
	.back {
		background: #ffa502;
	}
	.empty {
		padding: 14px;
		background: #fff3cd;
		border-radius: 8px;
		color: #5b4200;
	}
</style>