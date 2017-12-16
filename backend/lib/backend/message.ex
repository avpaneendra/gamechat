defmodule Backend.Message do
	
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

		entries = Registry.lookup(Backend.Registry, room_id)
		for {pid, uid} <- entries, do: send(pid, {:broadcast, json})
	end

	def handle(type, json, %{room_id: room_id, user_id: user_id, game: game} = state) do
		
		# find the game associated with the string "game" and pass it to there

		apply(String.to_existing_atom("Elixir.Backend.Game.#{game}"), :handle, [type, json, state])
	end

	def handle(type, json, state) do
		IO.inspect type
		IO.inspect json
		IO.puts "idk waht this is"

		# this needs to be routed to the correct "game"
		# if game is a part of state. user/room/game
	end

end