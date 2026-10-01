<script>
	import { onMount } from 'svelte';
	import { mdiCreditCard } from '@mdi/js';
	import { getActiveDb, getActiveDbConfig, decryptValue } from '$lib/db';
	import { fetchLedger, walletTotals, formatMoney, revertTransaction } from '$lib/pagos';
	import PaymentsTable from '$lib/comp/PaymentsTable.svelte';
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import { toast } from 'svelte5-toaster';

	let db = $state(null);
	let dbKey = $state('');
	let transactions = $state([]);
	let people = $state(new Map());
	let loading = $state(true);
	let changesFeed = null;

	const saldo = $derived(walletTotals(people));

	function dayStart(offsetDays = 0) {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		d.setDate(d.getDate() + offsetDays);
		return d;
	}

	// Sumas por tipo dentro de un rango [from, to) usando día local.
	function sumInRange(list, tipo, from, to) {
		return list
			.filter((t) => {
				if (t.data?.Tipo !== tipo) return false;
				const d = new Date(t.data?.Fecha);
				if (Number.isNaN(d.getTime())) return false;
				if (d < from) return false;
				if (to && d >= to) return false;
				return true;
			})
			.reduce((s, t) => s + parseFloat(t.data.Monto || 0), 0);
	}

	function trend(current, ref) {
		const delta = current - ref;
		if (Math.abs(delta) < 0.00001) return 'Sin cambios';
		const arrow = delta > 0 ? '↑' : '↓';
		return `${arrow} ${Math.abs(delta).toFixed(2)} € vs ayer`;
	}

	// Los indicadores de ingresos/gastos son del día actual (vs ayer).
	const startToday = $derived(dayStart(0));
	const startYesterday = $derived(dayStart(-1));
	const ingresos = $derived(sumInRange(transactions, 'Ingreso', startToday, null));
	const gastos = $derived(sumInRange(transactions, 'Gasto', startToday, null));
	const ingresosAyer = $derived(
		sumInRange(transactions, 'Ingreso', startYesterday, startToday)
	);
	const gastosAyer = $derived(sumInRange(transactions, 'Gasto', startYesterday, startToday));

	function startChanges() {
		stopChanges();
		if (!db) return;
		changesFeed = db
			.changes({ since: 'now', live: true, retry: true, include_docs: true })
			.on('change', (change) => {
				if (change.id?.startsWith('pagos:') || change.id?.startsWith('personas:')) loadLedger();
			})
			.on('error', (error) => console.error('Changes error:', error));
	}

	function stopChanges() {
		changesFeed?.cancel();
		changesFeed = null;
	}

	async function loadLedger() {
		if (!db) return;
		try {
			// Releer config con la clave por si cambió la base activa
			const config = getActiveDbConfig();
			if (!config) return;
			dbKey = config.encryptionKey;
			const { transactions: tx, people: pp } = await fetchLedger(db);
			transactions = tx
				.map((doc) => decryptValue(doc, dbKey))
				.sort((a, b) => String(b.data?.Fecha || '').localeCompare(String(a.data?.Fecha || '')));
			people = pp;
		} catch (error) {
			console.error('Error cargando movimientos:', error);
			toast.error('Error al cargar los movimientos.');
		} finally {
			loading = false;
		}
	}

	async function revert(tx) {
		if (!confirm('¿Revertir esta transacción? Se desharán los cambios de saldo y se eliminará.')) return;
		const res = await revertTransaction(db, tx._id);
		if (res.ok) {
			toast.success('Transacción revertida.');
			await loadLedger();
		} else {
			toast.error(res.error);
		}
	}

	async function loadActiveDatabase() {
		stopChanges();
		try {
			const config = getActiveDbConfig();
			db = getActiveDb();
			if (!config || !db) {
				transactions = [];
				people = new Map();
				loading = false;
				return;
			}
			await loadLedger();
			startChanges();
		} catch (error) {
			console.error(error);
			loading = false;
		}
	}

	onMount(() => {
		loadActiveDatabase();
		const onDb = () => loadActiveDatabase();
		window.addEventListener('database-changed', onDb);
		window.addEventListener('database-updated', onDb);
		return () => {
			stopChanges();
			window.removeEventListener('database-changed', onDb);
			window.removeEventListener('database-updated', onDb);
		};
	});
</script>

{#if db}
	<div class="head">
		<h1>💳 Pagos y Movimientos</h1>
		<LinkButton href="/payments/terminal" label="Datafono" icon={mdiCreditCard} background="purple" />
	</div>

	<div class="cards">
		<div class="card green">
			<span>Ingresos hoy</span>
			<b>{formatMoney(ingresos)}</b>
			<small>{trend(ingresos, ingresosAyer)}</small>
		</div>
		<div class="card red">
			<span>Gastos hoy</span>
			<b>{formatMoney(gastos)}</b>
			<small>{trend(gastos, gastosAyer)}</small>
		</div>
		<div class="card blue">
			<span>Saldo en monederos</span>
			<b>{formatMoney(saldo)}</b>
		</div>
	</div>

	{#if loading}
		<p class="empty">Cargando movimientos...</p>
	{:else}
		<PaymentsTable {transactions} {people} onRevert={revert} />
	{/if}
{:else}
	<p class="empty">
		Configura una base de datos activa en
		<a href="/settings/database">Ajustes de Base de Datos</a>.
	</p>
{/if}

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 15px;
	}
	.head h1 {
		margin: 0;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 12px;
		margin-bottom: 18px;
	}
	.card {
		border-radius: 10px;
		padding: 14px 16px;
		color: #fff;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.card span {
		font-weight: 600;
		font-size: 0.9em;
		opacity: 0.9;
	}
	.card small {
		opacity: 0.85;
		white-space: nowrap;
	}
	.card b {
		font-size: 1.5em;
	}
	.green {
		background: #2ed573;
	}
	.red {
		background: #ff4757;
	}
	.blue {
		background: #667eea;
	}
	.empty {
		padding: 14px;
		background: #fff3cd;
		border-radius: 8px;
		color: #5b4200;
	}
</style>