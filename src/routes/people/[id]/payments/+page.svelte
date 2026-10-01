<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { mdiArrowLeft } from '@mdi/js';
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import { getActiveDb, getActiveDbConfig, decryptValue } from '$lib/db';
	import { fetchLedger, formatMoney, personName, revertTransaction } from '$lib/pagos';
	import PaymentsTable from '$lib/comp/PaymentsTable.svelte';
	import { toast } from 'svelte5-toaster';

	let personId = $derived(page.params.id);

	let db = $state(null);
	let dbKey = $state('');
	let transactions = $state([]);
	let people = $state(new Map());
	let loading = $state(true);
	let changesFeed = null;

	const mine = $derived(
		transactions.filter(
			(t) => t.data?.Persona === personId || t.data?.PersonaDestino === personId
		)
	);

	const balance = $derived((() => {
		const p = people.get(`personas:${personId}`);
		return parseFloat(p?.Monedero_Balance || 0);
	})());

	const recibido = $derived(
		mine
			.filter(
				(t) =>
					t.data?.Tipo === 'Ingreso' ||
					(t.data?.Tipo === 'Transferencia' && t.data?.PersonaDestino === personId)
			)
			.reduce((s, t) => s + parseFloat(t.data.Monto || 0), 0)
	);

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

	function onDb() {
		stopChanges();
		db = getActiveDb();
		if (db) loadLedger().then(startChanges);
		else loading = false;
	}

	onMount(() => {
		try {
			db = getActiveDb();
			if (db) loadLedger().then(startChanges);
			else loading = false;
		} catch (error) {
			toast.error(error.message);
			loading = false;
		}
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
		<LinkButton href={`/people/${personId}`} label="Volver a la persona" icon={mdiArrowLeft} />
		<h1>💳 Movimientos de {personName(people, personId)}</h1>
	</div>

	<div class="cards">
		<div class="card blue">
			<span>Saldo actual</span>
			<b>{formatMoney(balance)}</b>
		</div>
		<div class="card green">
			<span>Total recibido</span>
			<b>{formatMoney(recibido)}</b>
		</div>
	</div>

	{#if loading}
		<p class="empty">Cargando movimientos...</p>
	{:else}
		<PaymentsTable transactions={mine} {people} forPersonId={personId} onRevert={revert} />
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
	.card b {
		font-size: 1.5em;
	}
	.green {
		background: #2ed573;
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