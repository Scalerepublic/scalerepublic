<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		FieldGroup,
		Field,
		FieldLabel,
		FieldDescription
	} from '$lib/components/ui/field/index.js';

	const id = $props.id();
</script>

<Card.Root class="mx-auto w-full max-w-sm">
	<Card.Header>
		<Card.Title class="text-2xl">Create an account</Card.Title>
		<Card.Description>Enter your details below to create your account</Card.Description>
	</Card.Header>
	<Card.Content>
		<form>
			<FieldGroup>
				<Field>
					<FieldLabel for="name-{id}">Full name</FieldLabel>
					<Input id="name-{id}" type="text" placeholder="John Doe" required />
				</Field>
				<Field>
					<FieldLabel for="email-{id}">Email</FieldLabel>
					<Input id="email-{id}" type="email" placeholder="m@example.com" required />
				</Field>
				<Field>
					<FieldLabel for="password-{id}">Password</FieldLabel>
					<Input id="password-{id}" type="password" required />
				</Field>
				<Field>
					<FieldLabel for="confirm-password-{id}">Confirm password</FieldLabel>
					<Input id="confirm-password-{id}" type="password" required />
				</Field>
				<Field>
					<Button type="submit" class="w-full">Create account</Button>
					<FieldDescription class="text-center">
						Already have an account? <a href="/login" class="underline">Log in</a>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	</Card.Content>
</Card.Root>
