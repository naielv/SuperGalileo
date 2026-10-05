<script>
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import { m } from '$lib/paraglide/messages';
	import { pb } from '$lib/pb';
	
</script>

<h1>¡Te damos la bienvenida a SuperGalileo!</h1>
<h2>Iniciar sesión</h2>

<form onsubmit={async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        try {
            await pb.collection('users').authWithPassword(email, password);
            window.location.href = '/';
        } catch (error) {
            alert('Error al iniciar sesión: ' + error.message);
        }
    }}>
    <div>
        <label for="email">Correo electrónico:</label>
        <input type="email" id="email" name="email" required />
    </div>
    <div>
        <label for="password">Contraseña:</label>
        <input type="password" id="password" name="password" required />
    </div>
    <button type="submit">Iniciar sesión</button>
</form>