defmodule Backend.WebsocketHandler do
	@behaviour :cowboy_websocket

	def init(req, state) do

		query = %{"room" => room_id, "user" => user_id} = String.split(req.qs, ["&", "="]) 
			|> Enum.chunk_every(2) 
			|> Enum.map(fn [a, b] -> {a, b} end)
			|> Map.new

		IO.inspect query
		IO.inspect room_id
		IO.inspect user_id

		%{"game" => game} = query

		IO.puts game
		IO.inspect byte_size(game)

		case query do
			%{"room" => room_id, "user" => user_id, "game" => game} when byte_size(game) > 0 ->
				{:cowboy_websocket, req, %{ room_id: room_id, user_id: user_id, game: game}}
			_ ->
				{:cowboy_websocket, req, %{ room_id: room_id, user_id: user_id }}
		end

	end

	def websocket_init(%{room_id: room_id, user_id: user_id} = state) do
		# we want to create this room if it doesn't exist.
		IO.puts "websocket init@"
		IO.inspect state
		IO.inspect Registry.lookup(Backend.Registry, room_id)

		{:ok, _} = Registry.register(Backend.Registry, room_id, user_id)

		Backend.Message.init(state)

		{:ok, state}
	end

	def terminate(reason, _req, %{room_id: room_id, user_id: user_id, game: game} = state) do
		
		Backend.Message.user_exit(state)
		IO.puts "#{state.user_id} exit"
		IO.inspect reason
		:ok
	end
	
	def terminate(reason, _req, %{room_id: room_id, user_id: user_id} = state) do
		
		IO.puts "#{state.user_id} exit"
		IO.inspect reason
		:ok
	end

	def websocket_handle({:text, content}, %{room_id: room_id, user_id: user_id} = state) do

		json = Poison.decode!(content)
		Backend.Message.handle(json["type"], json, state)

		{:ok, state}
	end

	def websocket_handle(_stuff, state) do
		{:ok, state}
	end

	def websocket_info({:broadcast, json}, state) do
		{:reply, {:text, Poison.encode!(json)}, state}
	end

	def websocket_info(_info, state) do
		IO.puts "unmatched info"
		{:ok, state}
	end
	
end