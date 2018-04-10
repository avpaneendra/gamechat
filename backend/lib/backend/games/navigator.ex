defmodule Backend.Game.Navigator do
	use GenServer

	def start_link({room_id, game}) do
	
		IO.puts "initting game"
		GenServer.start_link(__MODULE__, {room_id, game, %{}}, name: {:via, Registry, {Backend.GameRegistry, {room_id, game}}})
	end

	def user_enter(pid, user_id) do
		%{
			type: :state,
			payload: GenServer.call(pid, {:user_enter, user_id})
		}
	end

	def user_exit(pid, user_id) do
		GenServer.cast(pid, {:user_exit, user_id})
	end

	def handle(pid, "move", json, %{room_id: room_id, user_id: user_id, game: game}) do

		%{payload: %{direction: direction}} = json

		incr = 10
		{key, increment} = case direction do
			"ArrowLeft" -> {:x, -incr}
			"ArrowRight" -> {:x, incr}
			"ArrowUp" -> {:y, incr}
			"ArrowDown" -> {:y, -incr}
			_ -> IO.puts "no match for direction"
		end

		%{
			type: :state,
			payload: GenServer.call(pid, {:move, user_id, key, increment})
		}
	end

	def handle(pid, "shape", json, %{room_id: room_id, user_id: user_id, game: game}) do

		%{payload: %{shape: shape}} = json

		%{
			type: :state,
			payload: GenServer.call(pid, {:shape, user_id, shape})
		}
	end

	def handle(pid, "spin", json, %{user_id: uid} = state) do
		%{payload: %{spin: direction, orientation: orientation}} = json

		increment = 0.1 # rotations per second.
		positions = case direction do
			"xup" -> GenServer.call(pid, {:spin, uid, :x, increment, orientation})
			"xdown" -> GenServer.call(pid, {:spin, uid, :x, -increment, orientation})
			"yup" -> GenServer.call(pid, {:spin, uid, :y, increment, orientation})
			"ydown" -> GenServer.call(pid, {:spin, uid, :y, -increment, orientation})
			"zup" -> GenServer.call(pid, {:spin, uid, :z, increment, orientation})
			"zdown" -> GenServer.call(pid, {:spin, uid, :z, -increment, orientation})
			"stop" -> GenServer.call(pid, {:spin, uid, :stop, orientation})
			other -> IO.puts other
		end

		%{
			type: :state,
			payload: positions
		}
	end

	def handle_call({:user_enter, user_id}, _from, {room_id, game, positions}) do

		positions = Map.put(positions, user_id, %{ 
			position: %{x: 0, y: 0},
			rotation: %{x: 0, y: 0, z: 0},
			orientation: %{w: 1, x: 0, y: 0, z: 0, t: :os.system_time(:millisecond)},
			shape: "plane"
		})

		{:reply, positions, {room_id, game, positions}}
	end

	def handle_cast({:user_exit, user_id}, {room_id, game, positions} = state) do

		positions = Map.delete(positions, user_id)

		if (length(Map.keys(positions)) == 0) do
			{:stop, :empty_game, {room_id, game, positions}}
		else
			{:noreply, {room_id, game, positions}}
		end

	end

	def handle_call({:move, user_id, key, increment}, _from, {room_id, game, positions} = state) do

		{_, updated} = Kernel.get_and_update_in(positions, [user_id, :position, key], &{&1, &1 + increment })

		{:reply, updated, {room_id, game, updated}}

	end

	def handle_call({:shape, user_id, shape}, _from, {room_id, game, positions} = state) do

		positions = Kernel.put_in(positions, [user_id, :shape], shape)
		{:reply, positions, {room_id, game, positions}}

	end

	def handle_call({:spin, user_id, direction, increment, orientation}, _from, {room_id, game, positions} = state) do

		{_, updated} = Kernel.get_and_update_in(positions, [user_id, :rotation, direction], &{&1, &1 + increment })

		rotational_velocity = Kernel.get_in(updated, [user_id, :rotation])

		orientation = calculate_orientation(positions, user_id, rotational_velocity)
		updated = Kernel.put_in(updated, [user_id, :orientation], orientation)

		{:reply, updated, {room_id, game, updated}}
	end

	defp calculate_orientation(positions, user_id, %{x: 0, y: 0, z: 0}) do
		Kernel.get_in(positions, [user_id, :orientation])
	end

	defp calculate_orientation(positions, user_id, %{x: rx, y: ry, z: rz}) do

		# orientation is a quaternion.
		# rotation is in rotations per sec == 2pi*radians / sec

		t = :os.system_time(:millisecond)

		%{x: ox, y: oy, z: oz, t: pt, w: ow} = Kernel.get_in(positions, [user_id, :orientation])

		diff = t - pt # time that someone has been rotating at angular_velocity for in ms

		# first convert velocity to a rotation by multiplying by time diff
		w = Graphmath.Vec3.create(rx*diff, ry*diff, rz*diff)
		wbar = Graphmath.Vec3.length(w)
		{rx, ry, rz} = rrr = Graphmath.Vec3.scale(w, :math.sin(wbar/2) / wbar)

		# we can derive a quaternion for the rotation 
		q = Graphmath.Quatern.create(:math.cos(wbar/2), rx, ry, rz)

		# so now we have represented the rotation as a quaternion and the original state was a quaternion
		new_orient = Graphmath.Quatern.create(ow, ox, oy, oz)
		|> Graphmath.Quatern.multiply(q)

		{ww, x, y, z} = new_orient
		%{x: x, y: y, z: z, w: ww, t: t}
	end

	def handle_call({:spin, user_id, :stop, orientation}, _from, {room_id, game, positions} = state) do

		rotational_velocity = Kernel.get_in(positions, [user_id, :rotation])
		%{t: t} = calculated_orientation = calculate_orientation(positions, user_id, rotational_velocity)

		quatdiff = {
			calculated_orientation.w - orientation.w,
			calculated_orientation.x - orientation.x,
			calculated_orientation.y - orientation.y,
			calculated_orientation.z - orientation.z
		}

		positions = positions 
					|> Kernel.put_in([user_id, :rotation], %{x: 0, y: 0, z: 0})
					|> Kernel.put_in([user_id, :orientation], Map.put(orientation, :t, t))

		{:reply, positions, {room_id, game, positions}}

	end

	def handle(type, json, state) do
		IO.inspect type
		IO.inspect json 
		IO.inspect state
	end

end