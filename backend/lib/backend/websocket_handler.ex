defmodule Backend.WebsocketHandler do
	@behaviour :cowboy_websocket

	def init(req, state) do

		%{"room" => room_id, "user" => user_id} = String.split(req.qs, ["&", "="]) 
			|> Enum.chunk_every(2) 
			|> Enum.map(fn [a, b] -> {a, b} end)
			|> Map.new

		IO.inspect room_id
		IO.inspect user_id

		{:cowboy_websocket, req, %{
			room_id: room_id,
			user_id: user_id
		}}
	end

	def websocket_init(%{room_id: room_id, user_id: user_id} = state) do
		# we want to create this room if it doesn't exist.
		IO.inspect Registry.lookup(Backend.Registry, room_id)

		{:ok, _} = Registry.register(Backend.Registry, room_id, user_id)

		{:ok, state}
	end

	def terminate(reason, _req, state) do
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