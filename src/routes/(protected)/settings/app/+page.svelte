<script>
	import { onMount } from 'svelte';
	import { getLocalDb } from '$lib/db';
	import SvgIcon from '@jamescoyle/svelte-icon';
	import { mdiCog, mdiWeatherSunny, mdiCoffee, mdiContentSave } from '@mdi/js';
	import { m } from '$lib/paraglide/messages';
	import FormSubmitButton from '$lib/comp/buttons/FormSubmitButton.svelte';
	import { toast } from 'svelte5-toaster';

	let activeDbName = $state('');
	let dbInstance = $state(null);

	// Config fields
	let weatherLocation = $state('');
	let preciosCafe = $state({
		servicio_base: 10,
		leche_pequena: 15,
		leche_grande: 25,
		cafe: 25,
		colacao: 25
	});

	function loadActiveDatabase() {
		try {
			const raw = localStorage.getItem('pouchdb_connections_v1');
			const databases = raw ? JSON.parse(raw) : [];
			const activeId = localStorage.getItem('active_database_id');

			let activeDb = null;
			if (activeId) {
				activeDb = databases.find((d) => d.id === activeId);
			}
			if (!activeDb && databases.length > 0) {
				activeDb = databases[0];
				localStorage.setItem('active_database_id', activeDb.id);
			}

			if (activeDb) {
				activeDbName = activeDb.localDatabase;
				dbInstance = getLocalDb(activeDbName);
				toast.success(m.db_connected_to({ name: activeDbName }));
				loadConfig();
			} else {
				activeDbName = '';
				dbInstance = null;
				toast.warning(
					m.db_no_active()
				);
			}
		} catch (e) {
			toast.error(m.db_load_error({ error: e.message }));
		}
	}

	async function loadConfig() {
		if (!dbInstance) return;
		try {
			// Load weather location
			try {
				const doc = await dbInstance.get('config:weather_location');
				weatherLocation = doc.value || '';
			} catch (err) {
				if (err.status === 404) {
					weatherLocation = '';
				} else {
					throw err;
				}
			}

			// Load coffee prices
			try {
				const doc = await dbInstance.get('config:precios_cafe');
				preciosCafe = {
					servicio_base: doc.servicio_base ?? 10,
					leche_pequena: doc.leche_pequena ?? 15,
					leche_grande: doc.leche_grande ?? 25,
					cafe: doc.cafe ?? 25,
					colacao: doc.colacao ?? 25
				};
			} catch (err) {
				if (err.status === 404) {
					// Keep default values
				} else {
					throw err;
				}
			}
		} catch (e) {
			toast.error(m.load_failed({ error: e.message }));
		}
	}

	async function saveConfig(e) {
		e.preventDefault();
		if (!dbInstance) {
			toast.error(m.db_no_active());
			return;
		}

		try {
			// Save weather location
			let weatherDoc = { _id: 'config:weather_location', value: weatherLocation };
			try {
				const existing = await dbInstance.get('config:weather_location');
				weatherDoc._rev = existing._rev;
			} catch (err) {
				if (err.status !== 404) throw err;
			}
			await dbInstance.put(weatherDoc);

			// Save coffee prices
			let preciosDoc = {
				_id: 'config:precios_cafe',
				...preciosCafe
			};
			try {
				const existing = await dbInstance.get('config:precios_cafe');
				preciosDoc._rev = existing._rev;
			} catch (err) {
				if (err.status !== 404) throw err;
			}
			await dbInstance.put(preciosDoc);

			toast.success(m.save_success({ name: activeDbName }));
		} catch (err) {
			toast.error(m.save_error({ error: err.message }));
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

<h1>{m.app_settings()}</h1>

<main>
	{#if dbInstance}
		<form onsubmit={saveConfig}>
			<fieldset>
				<legend>
					<SvgIcon path={mdiWeatherSunny} type="mdi" size="1.2em" /> {m.weather_location()}
				</legend>
				<label style="margin-bottom: 0;">
					<b>{m.weather_location_info()}:</b>
					<input type="text" bind:value={weatherLocation} placeholder={m.weather_location_placeholder()} />
				</label>
			</fieldset>

			<fieldset style="margin-top: 20px;">
				<legend>
					<SvgIcon path={mdiCoffee} type="mdi" size="1.2em" /> {m.coffee_prices()}
				</legend>
				<div class="price-grid">
					<label>
						<b>{m.coffee_prices_base_service()}:</b>
						<input type="number" bind:value={preciosCafe.servicio_base} min="0" required />
					</label>
					<label>
						<b>{m.coffee_prices_small_milk()}:</b>
						<input type="number" bind:value={preciosCafe.leche_pequena} min="0" required />
					</label>
					<label>
						<b>{m.coffee_prices_large_milk()}:</b>
						<input type="number" bind:value={preciosCafe.leche_grande} min="0" required />
					</label>
					<label>
						<b>{m.coffee_prices_coffee()}:</b>
						<input type="number" bind:value={preciosCafe.cafe} min="0" required />
					</label>
					<label>
						<b>{m.coffee_prices_colacao()}:</b>
						<input type="number" bind:value={preciosCafe.colacao} min="0" required />
					</label>
				</div>
			</fieldset>

			<div class="form-actions">
				<FormSubmitButton label={m.save()} icon={mdiContentSave} />
			</div>
		</form>
	{:else}
		<div class="no-db-warning">
			<p>
				Por favor, ve a la página de Ajustes de Base de Datos para registrar y activar una base de
				datos local PouchDB.
			</p>
			<a href="/settings/database" class="button">Ir a Ajustes de Base de Datos</a>
		</div>
	{/if}
</main>

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

	.help-text {
		display: block;
		color: #666;
		font-size: 12px;
		margin-top: 4px;
	}

	.price-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 15px;
	}

	.price-grid label {
		margin-bottom: 0;
	}

	.price-grid input {
		width: 100%;
		padding: 8px;
		margin-top: 2.5px;
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

	.form-actions {
		display: flex;
		margin-top: 20px;
		justify-content: flex-end;
	}
</style>
