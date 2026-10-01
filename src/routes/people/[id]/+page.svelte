<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { safeRandomString, getActiveDb, getActiveDbConfig } from '$lib/db';
	import { m } from '$lib/paraglide/messages';

	import SvgIcon from '@jamescoyle/svelte-icon';
	import {
			mdiAccount,
			mdiArrowLeft,
			mdiBadgeAccount,
			mdiContentSave,
			mdiDelete,
			mdiEye,
			mdiEyeOff,
			mdiWallet
	} from '@mdi/js';

	import FormSubmitButton from '$lib/comp/buttons/FormSubmitButton.svelte';
	import ActionButton from '$lib/comp/buttons/ActionButton.svelte';
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import { toast } from 'svelte5-toaster';

	let id = $derived(page.params.id);
	let isNew = $derived(id === '_new');

	let db = $state(null);

	let nombre = $state('');
	let region = $state('');
	let roles = $state('');
	let oculto = $state(false);
	let markdown = $state('');
	let monederoBalance = $state(0);
	let existingRegions = $state([]);
	let rev = $state('');

	const predefinedRoles = {
		[m.system()]: {
			ADMIN: m.system_admin()
		},
		[m.people()]: {
			personas: m.people_access(),
			'personas:edit': m.people_edit()
		},
		[m.coffee_shop()]: {
			supercafe: m.supercafe_access(),
			'supercafe:edit': m.supercafe_edit()
		}
	};

	function resetForm() {
		nombre = '';
		region = '';
		roles = '';
		oculto = false;
		markdown = '';
		monederoBalance = 0;
		rev = '';
	}

	function toggleRole(role) {
		const current = roles
			.split(',')
			.map((r) => r.trim())
			.filter(Boolean);

		roles = current.includes(role)
			? current.filter((r) => r !== role).join(',')
			: [...current, role].join(',');
	}

	async function loadData(currentId) {
		if (!db) return;

		resetForm();

		try {
			const result = await db.allDocs({
				startkey: 'personas:',
				endkey: 'personas:\ufff0',
				include_docs: true
			});

			existingRegions = [
				...new Set(result.rows.map((row) => row.doc?.data?.Region).filter(Boolean))
			];

			if (currentId == '_new') {
				nombre = '';
				region = '';
				roles = '';
				oculto = false;
				markdown = '';
				monederoBalance = 0;
				rev = '';
				return;
			}

			const doc = await db.get(`personas:${currentId}`);
			const data = doc.data ?? {};

			nombre = data.Nombre ?? '';
			region = data.Region ?? '';
			roles = data.Roles ?? '';
			oculto = Boolean(data.Oculto);
			markdown = data.markdown ?? '';
			monederoBalance = Number(data.Monedero_Balance ?? 0);
			rev = doc._rev;
		} catch (error) {
			if (error.status === 404) {
				toast.error(
					m.load_failed({
						error: 'La persona solicitada no existe.'
					})
				);
			} else {
				toast.error(m.load_failed({ error: error.message }));
			}
		}
	}

	async function savePerson(event) {
		event.preventDefault();

		if (!db) return;

		const doc = {
			_id: isNew ? `personas:${Date.now()}_${safeRandomString()}` : `personas:${id}`,
			data: {
				Nombre: nombre.trim(),
				Region: region.trim(),
				Roles: roles.trim(),
				Oculto: oculto,
				markdown,
				Monedero_Balance: Number(monederoBalance)
			}
		};

		if (!isNew && rev) {
			doc._rev = rev;
		}

		try {
			await db.put(doc);

			toast.success(m.save_success({ name: nombre }));

			setTimeout(() => goto('/people'), 1000);
		} catch (error) {
			toast.error(
				m.save_error({
					name: nombre,
					error: error.message
				})
			);
		}
	}

	async function deletePerson() {
		if (isNew || !db || !confirm(`¿Seguro que deseas eliminar a ${nombre}?`)) {
			return;
		}

		try {
			const doc = await db.get(`personas:${id}`);
			await db.remove(doc);

			toast.success(m.delete_success({ name: nombre }));

			setTimeout(() => goto('/people'), 1000);
		} catch (error) {
			toast.error(
				m.delete_error({
					name: nombre,
					error: error.message
				})
			);
		}
	}

	onMount(() => {
		try {
			const config = getActiveDbConfig();

			if (!config) {
				return;
			}

			db = getActiveDb();
		} catch (error) {
			toast.error(m.db_load_error({ error: error.message }));
		}
	});

	$effect(() => {
		if (db && id) {
			loadData(id);
			window.dispatchEvent(new CustomEvent('sidebar-closed'));
		}
	});
</script>

{#if db}
	<form class="formflex" onsubmit={savePerson}>
		<div class="form-layout">
			<div>
				<fieldset>
					<legend>
						<SvgIcon path={mdiAccount} type="mdi" size="1.2em" />
						{m.personal_data()}
					</legend>

					<label>
						<b>{m.full_name()}</b>
						<input type="text" bind:value={nombre} placeholder="Ej. Juan Pérez" required />
					</label>

					<label>
						<b>{m.region_classroom()}</b>
						<input type="text" bind:value={region} placeholder="Ej. Aula C" list="regions-list" />

						<datalist id="regions-list">
							{#each existingRegions as r}
								<option value={r}>{r}</option>
							{/each}
						</datalist>

						<small class="help-text">
							{m.region_classroom_placeholder()}
						</small>
					</label>

					<label>
						<b>{m.roles()}:</b>
						<input type="text" bind:value={roles} placeholder="A,B,C" />

						<small class="help-text">
							{m.roles_placeholder()}
						</small>
					</label>

					<label>
						<b>{m.wallet_balance()}</b>
						<input disabled type="number" step="0.01" bind:value={monederoBalance} />
					</label>

					<label style="margin-top: 15px;">
						<b>{m.notes_section()}:</b>

						<textarea bind:value={markdown} rows="6" placeholder={m.notes_section_placeholder()}
						></textarea>
					</label>

					<label class="inline-check input">
						<input type="checkbox" style="display: none;" bind:checked={oculto} />

						<SvgIcon path={oculto ? mdiEyeOff : mdiEye} type="mdi" size="1.6em" />

						<span>
							{oculto ? m.hide_from_inputs() : m.show_in_inputs()}
						</span>
					</label>
				</fieldset>

				<div class="form-actions">
					<FormSubmitButton label={isNew ? m.new_person() : m.save()} icon={mdiContentSave} />

					{#if !isNew}
						<ActionButton
							label={m.delete()}
							icon={mdiDelete}
							background="#9f1a1a"
							onclick={deletePerson}
						/>
						<LinkButton
							href={`/people/${id}/payments`}
							label="Movimientos de pagos"
							icon={mdiWallet}
						/>
					{/if}
				</div>
			</div>

			<fieldset>
				<legend>
					<SvgIcon path={mdiBadgeAccount} type="mdi" size="1.2em" />
					{m.roles_and_permissions()}
				</legend>

				<div class="roles-permissions">
					{#each Object.entries(predefinedRoles) as [category, permissions]}
						<b>{category}</b>

						{#each Object.entries(permissions) as [key, label]}
							<label>
								{label}

								<input
									type="checkbox"
									checked={roles
										.split(',')
										.map((r) => r.trim())
										.includes(key)}
									onchange={() => toggleRole(key)}
								/>
							</label>
						{/each}
					{/each}
				</div>
			</fieldset>
		</div>
	</form>
{/if}

<style>
	.roles-permissions {
		display: flex;
		flex-direction: column;
		gap: 5px;
		overflow-y: auto;
	}

	.roles-permissions b {
		margin-top: 10px;
		font-size: 14px;
		text-align: center;
	}

	.roles-permissions label {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding: 5px 7.5px;
		border-radius: 5px;
		gap: 5px;
		border: 1px solid #000;
		margin: 0;
	}

	.roles-permissions label input[type='checkbox'] {
		width: 20px;
		height: 20px;
		margin: 0;
	}

	.form-layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: 20px;
	}

	@media (min-width: 768px) {
		.form-layout {
			grid-template-columns: 1.2fr 0.8fr;
		}
	}

	.main-form {
		width: 100%;
	}

	.help-text {
		display: block;
		color: #666;
		font-size: 12px;
		margin-top: 4px;
	}

	.inline-check {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 15px;
	}

	.form-actions {
		display: flex;
		gap: 10px;
		margin-top: 20px;
		align-items: center;
		flex-wrap: wrap;
	}

	fieldset {
		width: 100%;
		max-width: 400px;
		background-color: white;
	}
	legend {
		background-color: white;
		padding: 0 5px;
	}
	.formflex {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 15px;
		background-color: wheat;
		height: 100%;
		padding: 15px;
	}
</style>
