<script>
	import { onMount } from 'svelte';
	import { safeRandomString } from '$lib/db.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getActiveDb, getActiveDbConfig } from '$lib/db';
	import SvgIcon from '@jamescoyle/svelte-icon';
	import {
		mdiAccount,
		mdiArrowLeft,
		mdiBadgeAccount,
		mdiContentSave,
		mdiDelete,
		mdiEye,
		mdiEyeOff
	} from '@mdi/js';
	import FormSubmitButton from '$lib/comp/buttons/FormSubmitButton.svelte';
	import ActionButton from '$lib/comp/buttons/ActionButton.svelte';
	import { m } from '$lib/paraglide/messages';

	// Get ID from route params
	const idParam = page.params.id;
	const isNew = idParam === '_new';

	let activeDbName = $state('');
	let dbInstance = $state(null);
	let feedback = $state({ type: 'info', message: '' });

	// Form state
	let nombre = $state('');
	let region = $state('');
	let roles = $state('');
	let oculto = $state(false);
	let markdown = $state('');
	let monederoBalance = $state(0);

  let predefinedRoles = {
    [m.system()]: {
      "ADMIN": m.system_admin(),
    },
    [m.people()]: {
      "personas": m.people_access(),
      "personas:edit": m.people_edit(),
    },
    [m.coffee_shop()]: {
      "supercafe": m.supercafe_access(),
      "supercafe:edit": m.supercafe_edit(),
    },
  };

	// Predefined list of regions loaded from other entries
	let existingRegions = $state([]);
	let rev = $state('');

	function setFeedback(message, type = 'info') {
		feedback = { type, message };
	}

	// Safe markdown to HTML converter to avoid XSS
	function renderSafeMarkdown(md) {
		if (!md) return '';

		// 1. Escape HTML to prevent XSS
		let html = md
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');

		// 2. Convert bold (**text**)
		html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

		// 3. Convert italics (*text*)
		html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

		// 4. Convert links ([text](url)) safely
		html = html.replace(
			/\[(.*?)\]\((https?:\/\/.*?)\)/g,
			'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
		);

		// 5. Convert newlines to <br>
		html = html.replace(/\n/g, '<br>');

		return html;
	}

	function loadActiveDatabase() {
		try {
			const activeDb = getActiveDbConfig();
			dbInstance = getActiveDb();

			if (activeDb && dbInstance) {
				activeDbName = activeDb.localDatabase;
				loadData();
			} else {
				setFeedback(m.db_no_active(), 'warning');
			}
		} catch (e) {
			setFeedback(m.db_load_error({ error: e.message }), 'error');
		}
	}

	async function loadData() {
		if (!dbInstance) return;
		try {
			// Load all people to extract existing regions
			const allResult = await dbInstance.allDocs({
				startkey: 'personas:',
				endkey: 'personas:\ufff0',
				include_docs: true
			});
			const allPeople = allResult.rows
				.map((row) => row.doc?.data)
				.filter((p) => p !== undefined && p !== null);

			const regionsSet = new Set();
			allPeople.forEach((p) => {
				if (p.Region) {
					regionsSet.add(p.Region);
				}
			});
			existingRegions = Array.from(regionsSet);

			if (!isNew) {
				// Load specific person
				const docId = `personas:${idParam}`;
				try {
					const doc = await dbInstance.get(docId);
					const data = doc.data || {};
					nombre = data.Nombre || '';
					region = data.Region || '';
					roles = data.Roles || '';
					oculto = Boolean(data.Oculto);
					markdown = data.markdown || '';
					monederoBalance = Number(data.Monedero_Balance || 0);
					rev = doc._rev;
				} catch (err) {
					if (err.status === 404) {
						setFeedback(m.load_failed({ error: 'La persona solicitada no existe.' }), 'error');
					} else {
						throw err;
					}
				}
			}
		} catch (e) {
			setFeedback(m.load_failed({ error: e.message }), 'error');
		}
	}

	async function savePerson(e) {
		e.preventDefault();
		if (!dbInstance) return;

		const docId = isNew
			? `personas:${Date.now()}_${safeRandomString()}` // Use default size
			: `personas:${idParam}`;

		const payload = {
			_id: docId,
			data: {
				Nombre: nombre.trim(),
				Region: region.trim(),
				Roles: roles.trim(),
				Oculto: oculto,
				markdown: markdown,
				Monedero_Balance: Number(monederoBalance)
			}
		};

		if (!isNew && rev) {
			payload._rev = rev;
		}

		try {
			await dbInstance.put(payload);
			setFeedback(m.save_success({ name: nombre }), 'success');
			setTimeout(() => {
				goto('/people');
			}, 1000);
		} catch (err) {
			setFeedback(m.save_error({ name: nombre, error: err.message }), 'error');
		}
	}

	async function deletePerson() {
		if (!confirm(`¿Seguro que deseas eliminar a ${nombre}?`)) return;
		if (!dbInstance || isNew) return;

		try {
			const doc = await dbInstance.get(`personas:${idParam}`);
			await dbInstance.remove(doc);
			setFeedback(m.delete_success({ name: nombre }), 'success');
			setTimeout(() => {
				goto('/people');
			}, 1000);
		} catch (err) {
			setFeedback(m.delete_error({ name: nombre, error: err.message }), 'error');
		}
	}

	onMount(() => {
		loadActiveDatabase();
	});
</script>

<div class="header-container">
	<a href="/people" class="back-link">
		<SvgIcon path={mdiArrowLeft} type="mdi" size="1.2em" /> {m.go_back_personas()}
	</a>
	<h1>{isNew ? m.new_person() : m.edit_wname({ name: nombre })}</h1>
</div>

<main>
	{#if feedback.message}
		<p class="status-banner {feedback.type}">{feedback.message}</p>
	{/if}

	{#if dbInstance}
		<form onsubmit={savePerson} class="main-form">
			<div class="form-layout">
				<div>
					<fieldset>
						<legend>
							<SvgIcon path={mdiAccount} type="mdi" size="1.2em" /> {m.personal_data()}
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
							<small class="help-text"
								>{m.region_classroom_placeholder()}</small
							>
						</label>

						<label>
							<b>{m.roles()}:</b>
							<input type="text" bind:value={roles} placeholder="A,B,C" />
							<small class="help-text">{m.roles_placeholder()}</small>
						</label>

						<label>
							<b>{m.wallet_balance()}</b>
							<input
								disabled
								type="number"
								step="0.01"
								bind:value={monederoBalance}
								placeholder="0.00"
								required
							/>
						</label>

						<label style="margin-top: 15px;">
							<b>{m.notes_section()}:</b>
							<textarea
								bind:value={markdown}
								rows="6"
								placeholder={m.notes_section_placeholder()}
							></textarea>
						</label>

						<label class="inline-check input">
							<input type="checkbox" style="display: none;" bind:checked={oculto} />
							<SvgIcon path={oculto ? mdiEyeOff : mdiEye} type="mdi" size="1.6em" />
							<span>{oculto ? m.hide_from_inputs() : m.show_in_inputs()}</span>
						</label>
					</fieldset>

					<div class="form-actions">
						<FormSubmitButton
							label={isNew ? m.new_person() : m.save()}
							icon={mdiContentSave}
						/>
						{#if !isNew}
							<ActionButton
								label={m.delete()}
								icon={mdiDelete}
								background="#9f1a1a"
								onclick={deletePerson}
							/>
						{/if}
					</div>
				</div>
				<fieldset>
					<!-- Roles -->
					<legend>
						<SvgIcon path={mdiBadgeAccount} type="mdi" size="1.2em" /> {m.roles_and_permissions()}
					</legend>
					<div class="roles-permissions">
            {#each Object.entries(predefinedRoles) as [category, perms]}
              <b>{category}</b>
              {#each Object.entries(perms) as [permKey, permLabel]}
                <label>
                  {permLabel}
                  <input
                    type="checkbox"
                    checked={roles.includes(permKey)}
                    onchange={() => {
                      if (roles.includes(permKey)) {
                        roles = roles
                          .split(',')
                          .filter((r) => r.trim() !== permKey && r.trim() !== '')
                          .join(',');
                      } else {
                        roles = roles ? `${roles},${permKey}` : permKey;
                      }
                    }}
                  />
                </label>
              {/each}
            {/each}
					</div>
				</fieldset>
			</div>
		</form>
	{/if}
</main>

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
@media (prefers-color-scheme: dark) {
  .roles-permissions label {
    border: 1px solid #fff;
  }
}
.roles-permissions label input[type="checkbox"] {
  width: 20px;
  height: 20px;
  margin: 0;
}
	.header-container {
		background: darkslateblue;
		padding: 10px 20px;
    padding-top: 2.5px;
		color: white;
		text-align: center;
		position: relative;
	}

	.header-container h1 {
		background: transparent;
		padding: 0;
		margin: 0;
	}

	.back-link {
		position: absolute;
		left: 15px;
		top: 50%;
		transform: translateY(-50%);
		color: white;
		text-decoration: none;
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 16px;
	}

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

	.preview-panel {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		padding: 15px;
		align-self: start;
	}

	.preview-panel h3 {
		margin-top: 0;
		margin-bottom: 10px;
		font-size: 16px;
		border-bottom: 1px solid #e2e8f0;
		padding-bottom: 5px;
		color: #334155;
	}

	.markdown-body {
		font-size: 14px;
		line-height: 1.5;
		color: #334155;
		word-break: break-word;
	}

	.markdown-body :global(a) {
		color: #2563eb;
		text-decoration: underline;
	}

	.markdown-body :global(strong) {
		font-weight: bold;
	}

	.markdown-body :global(em) {
		font-style: italic;
	}
</style>
