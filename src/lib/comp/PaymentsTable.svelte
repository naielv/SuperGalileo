<script>
	import { formatDateTime, formatMoney, typeMeta, estadoMeta, personName } from '$lib/pagos';
	import SvgIcon from '@jamescoyle/svelte-icon';
	import { mdiUndoVariant } from '@mdi/js';

	let { transactions = [], people = new Map(), forPersonId = '', showPerson = true, onRevert = null } =
		$props();

	/** Dirección de un movimiento visto desde el contexto (global o de una persona). */
	function direction(tx) {
		const tipo = tx.data?.Tipo || '';
		const source = tx.data?.Persona;
		const dest = tx.data?.PersonaDestino;

		if (forPersonId) {
			// Desde el punto de vista de la persona concreta
			if (tipo === 'Transferencia') {
				if (dest === forPersonId && source !== forPersonId) return 'in'; // recibió
				if (source === forPersonId) return 'out'; // envió
			}
			if (tipo === 'Ingreso' && source === forPersonId) return 'in';
		}

		return tipo === 'Ingreso' ? 'in' : 'out';
	}

	function amountMeta(tx) {
		const dir = direction(tx);
		const monto = parseFloat(tx.data?.Monto || 0);
		if (tx.data?.Tipo === 'Transferencia' && dir === 'in') return { sign: '+', color: '#2ed573', text: formatMoney(monto) };
		if (tx.data?.Tipo === 'Transferencia') return { sign: '', color: '#667eea', text: formatMoney(monto) };
		if (dir === 'in') return { sign: '+', color: '#2ed573', text: formatMoney(monto) };
		return { sign: '−', color: '#ff4757', text: formatMoney(monto) };
	}

	function concepto(tx) {
		const source = personName(people, tx.data?.Persona);
		if (tx.data?.Tipo === 'Transferencia') {
			const dest = personName(people, tx.data?.PersonaDestino);
			return `${source} → ${dest}`;
		}
		return source;
	}

	function personHref(tx) {
		const pid =
			tx.data?.Tipo === 'Transferencia' ? tx.data?.PersonaDestino : tx.data?.Persona;
		return pid ? `/people/${pid}/payments` : '#';
	}
</script>

{#if transactions.length === 0}
	<p class="empty">No hay movimientos.</p>
{:else}
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Fecha</th>
					<th>Tipo</th>
					<th>Concepto</th>
					<th class="num">Monto</th>
					<th>Método</th>
					<th>Estado</th>
					{#if onRevert}<th></th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each transactions as tx (tx._id)}
					{@const meta = typeMeta(tx.data?.Tipo)}
					{@const am = amountMeta(tx)}
					{@const em = estadoMeta(tx.data?.Estado)}
					<tr>
						<td class="date">{formatDateTime(tx.data?.Fecha)}</td>
						<td>
							<span class="badge" style:background={meta.color}>{meta.icon} {tx.data?.Tipo || '—'}</span>
						</td>
						<td>
							{#if showPerson}
								<a href={personHref(tx)}>{concepto(tx)}</a>
							{:else}
								{concepto(tx)}
							{/if}
						</td>
						<td class="num" style:color={am.color}>
							<b>{am.sign}{am.text}</b>
						</td>
						<td>{tx.data?.Metodo || '—'}</td>
						<td><span class="badge" style:background={em.color}>{tx.data?.Estado || '—'}</span></td>
						{#if onRevert}
							<td class="num">
								<button
									type="button"
									class="icon-btn"
									title="Revertir transacción"
									onclick={() => onRevert(tx)}
								><SvgIcon path={mdiUndoVariant} type="mdi" size="1.1em" /></button>
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.table-wrap {
		overflow-x: auto;
		background: #fff;
		border-radius: 10px;
		border: 1px solid #ddd;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 640px;
	}
	th,
	td {
		padding: 9px 12px;
		text-align: left;
		border-bottom: 1px solid #eee;
		vertical-align: middle;
	}
	th {
		background: #eef2f7;
		font-weight: 700;
		white-space: nowrap;
	}
	tr:last-child td {
		border-bottom: none;
	}
	.num {
		text-align: right;
		white-space: nowrap;
	}
	.date {
		white-space: nowrap;
		font-size: 0.9em;
		color: #334155;
	}
	.badge {
		display: inline-block;
		color: #fff;
		padding: 3px 9px;
		border-radius: 5px;
		font-weight: 700;
		font-size: 0.85em;
		white-space: nowrap;
	}
	.icon-btn {
		border: 1px solid #94a3b8;
		border-radius: 4px;
		background: #fff;
		cursor: pointer;
		color: #9f1a1a;
		line-height: 0;
		padding: 4px;
	}
	.icon-btn:hover {
		background: #ffe1e1;
	}
	.empty {
		padding: 14px;
		background: #fff3cd;
		border-radius: 8px;
		color: #5b4200;
	}
</style>