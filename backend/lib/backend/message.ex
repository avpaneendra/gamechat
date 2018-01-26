defmodule Backend.Message do

	def init(%{game: game, room_id: room_id, user_id: user_id} = state) do

		res = DynamicSupervisor.start_child(Backend.GameSupervisor, {String.to_existing_atom("Elixir.Backend.Game.#{game}"), {room_id, game}})

		case res do
			{:ok, pid} -> apply(String.to_existing_atom("Elixir.Backend.Game.#{game}"), :user_enter, [pid, user_id])
			{:error, {:already_started, pid}} -> apply(String.to_existing_atom("Elixir.Backend.Game.#{game}"), :user_enter, [pid, user_id])
			_ -> IO.puts "oh shit not a match"
		end
		
	end

	def init(%{room_id: room_id, user_id: user_id} = state) do

		IO.puts "no game associated with state"
	end

	# signaling, ping and member_join are fundamental to all rooms so handled here
	def handle("signaling", json, %{room_id: room_id, user_id: user_id} = state)  do

		%{ "target" => %{ "id" => target_id }} = json

		entries = Registry.lookup(Backend.Registry, room_id)
		for {pid, uid} <- entries do
			if String.equivalent?(uid, target_id) do
				send(pid, {:broadcast, json})
			end
		end
	end

	def handle("ping", _json, _state) do
		nil
	end

	def handle("member_join", json, %{room_id: room_id, user_id: user_id}) do
		broadcast(room_id, json)
	end

	defp broadcast(room_id, json) do
		entries = Registry.lookup(Backend.Registry, room_id)
		for {pid, uid} <- entries, do: send(pid, {:broadcast, json})
	end

	def handle(type, json, %{room_id: room_id, user_id: user_id, game: game} = state) do
		
		# find the game associated with the string "game" and pass it to there
		# broadcast the result returned

		res = Registry.lookup(Backend.GameRegistry, { room_id, game })
		case res do
			[{pid, _}] -> broadcast(room_id, apply(String.to_existing_atom("Elixir.Backend.Game.#{game}"), :handle, [pid, type, json, state]))
			[] -> IO.puts "no game!"
			_ -> IO.puts "something else in case?"
		end

	end

	def user_exit(%{room_id: room_id, user_id: user_id, game: game} = state) do
		res = Registry.lookup(Backend.GameRegistry, { room_id, game })

		case res do
			[{pid, _}] -> apply(String.to_existing_atom("Elixir.Backend.Game.#{game}"), :user_exit, [pid, user_id])
			_ -> IO.puts "no game"
		end

	end

	def handle(type, json, state) do
		IO.inspect type
		IO.inspect json
		IO.puts "idk what this is"
	end

end