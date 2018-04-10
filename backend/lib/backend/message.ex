defmodule Backend.Message do

	def init(%{game: game, room_id: room_id, user_id: user_id} = state) do

		res = DynamicSupervisor.start_child(Backend.GameSupervisor, {String.to_existing_atom("Elixir.Backend.Game.#{game}"), {room_id, game}})

		# case res do
		# 	{:ok, pid} -> apply(String.to_existing_atom("Elixir.Backend.Game.#{game}"), :user_enter, [pid, user_id])
		# 	{:error, {:already_started, pid}} -> apply(String.to_existing_atom("Elixir.Backend.Game.#{game}"), :user_enter, [pid, user_id])
		# 	_ -> IO.puts "oh shit not a match"
		# end
		
	end

	def init(%{room_id: room_id, user_id: user_id} = state) do

		IO.puts "no game associated with state"
	end

	# signaling, ping and member_join are fundamental to all rooms so handled here
	def handle("signaling", json, %{room_id: room_id, user_id: user_id} = state)  do

		%{target: %{id: target_id}} = json

		send_to_id(room_id, target_id, json)
	end

	def handle("ping", _json, _state) do
		nil
	end

	def handle("member_join", json, %{room_id: room_id, user_id: user_id, game: game}) do
		broadcast(room_id, json)

		res = Registry.lookup(Backend.GameRegistry, { room_id, game })
		case res do
			[{pid, _}] -> send_to_id(room_id, user_id, apply(String.to_existing_atom("Elixir.Backend.Game.#{game}"), :user_enter, [pid, user_id]))
			[] -> IO.puts "no game!"
			_ -> IO.puts "something else in case?"
		end
	end

	def handle("member_join", json, %{room_id: room_id, user_id: user_id}) do
		IO.puts "got member join"
		broadcast(room_id, json)
	end

	defp broadcast(room_id, json) do
		entries = Registry.lookup(Backend.Registry, room_id)
		for {pid, uid} <- entries, do: send(pid, {:broadcast, json})
	end

	defp send_to_id(room_id, user_id, json) do
		for {pid, uid} <- Registry.lookup(Backend.Registry, room_id) do
			if String.equivalent?(uid, user_id) do
				send(pid, {:broadcast, json})
			end
		end
	end

	def handle(type, json, %{room_id: room_id, user_id: user_id, game: game} = state) do

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