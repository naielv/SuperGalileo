<script>
	import { onMount } from 'svelte';
	import { getActiveDb, getActiveDbConfig } from '$lib/db';
	import { mdiAccountPlus, mdiPrinter } from '@mdi/js';
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import DataTable from '$lib/comp/DataTable.svelte';
	import ActionButton from '$lib/comp/buttons/ActionButton.svelte';
	import PersonTableRow from '$lib/comp/people/PersonTableRow.svelte';
	import { m } from '$lib/paraglide/messages';
	let activeDbName = $state('');
	let dbInstance = $state(null);
	let feedback = $state({ type: 'info', message: '' });
	let dataTableRef = $state(null);

	function setFeedback(message, type = 'info') {
		feedback = { type, message };
	}

	function loadActiveDatabase() {
		try {
			const activeDb = getActiveDbConfig();
			dbInstance = getActiveDb();

			if (activeDb && dbInstance) {
				activeDbName = activeDb.localDatabase;
			} else {
				activeDbName = '';
				dbInstance = null;
				setFeedback(m.db_no_active(), 'warning');
			}
		} catch (e) {
			setFeedback('Error al cargar la base de datos activa: ' + e.message, 'error');
		}
	}

	async function deletePerson(person) {
		if (!confirm(m.delete_warning({ name: person.Nombre }))) return;
		try {
			await dbInstance.remove(person);
			setFeedback(m.delete_success({ name: person.Nombre }), 'success');
			if (dataTableRef) {
				dataTableRef.loadData();
			}
		} catch (e) {
			setFeedback(m.delete_error({ name: person.Nombre, error: e.message }), 'error');
		}
	}

	onMount(() => {
		loadActiveDatabase();

		const handleDbChange = () => {
			loadActiveDatabase();
		};

		window.addEventListener('database-changed', handleDbChange);
		window.addEventListener('database-updated', handleDbChange);

		return () => {
			window.removeEventListener('database-changed', handleDbChange);
			window.removeEventListener('database-updated', handleDbChange);
		};
	});
</script>

{#if feedback.message}
	<p class="status-banner {feedback.type}">{feedback.message}</p>
{/if}

{#if dbInstance}
	<div class="flex-header">
		<h1>{m.people()}</h1>
		<div class="top-actions">
			<ActionButton onclick={() => window.print()} icon={mdiPrinter} label={m.print()} />
			<LinkButton
				href="/people/_new"
				icon={mdiAccountPlus}
				label={m.new_person()}
				background="darkolivegreen"
			/>
		</div>
	</div>

	{#key dbInstance}
		<DataTable
			bind:this={dataTableRef}
			{dbInstance}
			startkey="personas:"
			endkey={'personas:\uffff'}
			searchFields={['Nombre', 'Roles']}
			filterFields={['Region']}
			sortByFields={[
				{ label: 'Nombre', key: 'Nombre' },
				{ label: 'Balance', key: 'Monedero_Balance' }
			]}
			groupByFields={[{ label: 'Región', key: 'Region' }]}
			columns={[
				{ label: 'Foto', width: "70px"},
				{ label: 'Nombre', key: 'Nombre', sortable: true },
				{ label: 'Región', key: 'Region' },
				{ label: 'Saldo', key: 'Monedero_Balance', sortable: true },
				{ label: 'Acciones', key: 'actions', align: 'right' }
			]}
		>
			{#snippet rowSnippet(person)}
				<PersonTableRow {person} onDelete={deletePerson} />
			{/snippet}
		</DataTable>
	{/key}
{:else}
	<div class="no-db-warning">
		<p>
			{m.db_not_connected_to_any()} <br />
			{m.db_configure_in_settings()}
		</p>
		<a href="/settings/database" class="button">Ir a Ajustes de Base de Datos</a>
	</div>
{/if}

<style>
	.status-banner {
		padding: 10px;
		border-radius: 5px;
		margin-bottom: 15px;
		font-weight: bold;
	}

	.status-banner.success {
		background: #d9f7dd;
		color: #124218;
	}

	.status-banner.warning {
		background: #fff4cc;
		color: #5b4200;
	}

	.status-banner.error {
		background: #ffe1e1;
		color: #6f1111;
	}

	.roles-list {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.balance-cell {
		font-family: monospace;
		font-size: 15px;
		font-weight: bold;
	}

	.balance.positive {
		color: #15803d;
	}

	.balance.negative {
		color: #b91c1c;
	}

	.text-muted {
		color: #888;
	}

	.no-db-warning {
		text-align: center;
		padding: 40px 20px;
		background: #fff4cc;
		border: 1px solid #ffeb3b;
		border-radius: 8px;
		color: #5b4200;
	}

	.no-db-warning p {
		margin-bottom: 20px;
		font-size: 18px;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 6px;
	}
</style>
